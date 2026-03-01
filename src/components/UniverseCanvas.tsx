"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Book } from "@/types/library";

// Glowのテクスチャは全ての星で共通なので，最初の呼び出し時に1回だけ生成してキャッシュする
let _glowTex: THREE.CanvasTexture | null = null;
function getGlowTex(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.06, "rgba(255,255,255,0.95)");
  g.addColorStop(0.2, "rgba(255,255,255,0.55)");
  g.addColorStop(0.55, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

// ─── Glow Sprite ──────────────────────────────────────────────────────────────
function GlowSprite({
  color,
  scale,
  opacity,
}: {
  color: string;
  scale: number;
  opacity: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: getGlowTex(),
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, opacity],
  );
  return <sprite material={mat} scale={[scale, scale, 1]} />;
}

// ─── Cross Spike Rays (4-way + 4-way diagonal) ───────────────────────────────
function StarSpikes({
  color,
  size,
  opacity,
}: {
  color: string;
  size: number;
  opacity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color, opacity],
  );
  const geoH = useMemo(
    () => new THREE.PlaneGeometry(size, size * 0.018),
    [size],
  );
  const geoV = useMemo(
    () => new THREE.PlaneGeometry(size * 0.018, size),
    [size],
  );
  const geoD1 = useMemo(
    () => new THREE.PlaneGeometry(size * 0.6, size * 0.012),
    [size],
  );
  const geoD2 = useMemo(
    () => new THREE.PlaneGeometry(size * 0.6, size * 0.012),
    [size],
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.35) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geoH} material={mat} />
      <mesh geometry={geoV} material={mat} />
      <mesh geometry={geoD1} material={mat} rotation={[0, 0, Math.PI / 4]} />
      <mesh geometry={geoD2} material={mat} rotation={[0, 0, -Math.PI / 4]} />
    </group>
  );
}

// ─── Orbit Ring (reading status) ──────────────────────────────────────────────
function OrbitRing({
  color,
  radius,
  opacity,
}: {
  color: string;
  radius: number;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        wireframe: true,
      }),
    [color, opacity],
  );
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.65;
      ref.current.rotation.y = state.clock.elapsedTime * 1.05;
    }
  });
  return (
    <mesh ref={ref} material={mat}>
      <torusGeometry args={[radius, 0.003, 4, 64]} />
    </mesh>
  );
}

// ─── Book Star ────────────────────────────────────────────────────────────────
function BookStar({
  book,
  onClick,
  isSelected,
  reducedMotion,
}: {
  book: Book;
  onClick: (book: Book) => void;
  isSelected: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Sprite>(null);

  const isCompleted = book.status === "completed";
  const isReading = book.status === "reading";
  const isUnread = book.status === "unread";

  const coreScale = isCompleted ? 0.24 : isReading ? 0.17 : 0.1;
  const spikeSize = isCompleted ? 1.2 : isReading ? 0.8 : 0.42;
  const glow1 = coreScale * 3.5;
  const glow2 = coreScale * 8.5;
  const glow3 = coreScale * 20;

  const coreMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: getGlowTex(),
        color: "#ffffff",
        transparent: true,
        opacity: isUnread ? 0.55 : 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    // only depends on status bucket, not per-frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUnread],
  );

  const hitMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  const hitGeo = useMemo(() => new THREE.SphereGeometry(0.2, 8, 8), []);

  useFrame((state) => {
    if (!groupRef.current || !coreRef.current) return;
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const seed = parseFloat(book.id) * 2.3 + 1;

    if (isReading) {
      const pulse = 1 + Math.sin(t * 2.2 + seed) * 0.18;
      groupRef.current.scale.setScalar(pulse);
    }

    if (isUnread) {
      const flicker =
        0.35 +
        Math.abs(Math.sin(t * 0.85 + seed)) * 0.35 +
        Math.abs(Math.sin(t * 2.9 + seed * 0.7)) * 0.15;
      (coreRef.current.material as THREE.SpriteMaterial).opacity = flicker;
    }

    if (isSelected) {
      const pulse = 1 + Math.sin(t * 4) * 0.12;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={book.position}>
      {/* Layered diffuse glows */}
      <GlowSprite
        color={book.color}
        scale={glow3}
        opacity={isUnread ? 0.04 : 0.08}
      />
      <GlowSprite
        color={book.color}
        scale={glow2}
        opacity={isUnread ? 0.09 : 0.2}
      />
      <GlowSprite
        color={book.color}
        scale={glow1}
        opacity={isUnread ? 0.22 : 0.6}
      />

      {/* Cross spike rays */}
      <StarSpikes
        color={book.color}
        size={spikeSize}
        opacity={isUnread ? 0.28 : 0.7}
      />

      {/* White-hot core */}
      <sprite
        ref={coreRef}
        material={coreMat}
        scale={[coreScale, coreScale, 1]}
      />

      {/* Selected: extra bright halo */}
      {isSelected && (
        <>
          <GlowSprite color="#ffffff" scale={glow2 * 2.0} opacity={0.22} />
          <GlowSprite color={book.color} scale={glow2 * 1.3} opacity={0.4} />
          <StarSpikes color="#ffffff" size={spikeSize * 2.0} opacity={0.55} />
        </>
      )}

      {/* Reading: orbiting energy ring */}
      {isReading && (
        <OrbitRing color={book.color} radius={coreScale * 3.2} opacity={0.6} />
      )}

      {/* Invisible click target */}
      <mesh
        geometry={hitGeo}
        material={hitMat}
        onClick={(e) => {
          e.stopPropagation();
          onClick(book);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      />
    </group>
  );
}

// ─── Constellation Lines (animated shimmer) ───────────────────────────────────
function ConstellationLines({
  books,
  lines,
}: {
  books: Book[];
  lines: [string, string][];
}) {
  const lineObjects = useMemo(() => {
    return lines
      .map(([fromId, toId]) => {
        const from = books.find((b) => b.id === fromId);
        const to = books.find((b) => b.id === toId);
        if (!from || !to) return null;
        if (from.status !== "completed" || to.status !== "completed")
          return null;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...from.position),
          new THREE.Vector3(...to.position),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: "#93c5fd",
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending,
        });
        return new THREE.Line(geo, mat);
      })
      .filter(Boolean) as THREE.Line[];
  }, [books, lines]);

  useFrame((state) => {
    lineObjects.forEach((line, i) => {
      (line.material as THREE.LineBasicMaterial).opacity =
        0.18 + Math.sin(state.clock.elapsedTime * 0.55 + i * 1.4) * 0.12;
    });
  });

  return (
    <>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </>
  );
}

// ─── Cosmic Dust Cloud ────────────────────────────────────────────────────────
function DustCloud({
  color,
  count,
  speed,
  size,
}: {
  color: string;
  count: number;
  speed: number;
  size: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * speed;
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.43;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Reduced Motion Hook ──────────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────
export default function UniverseCanvas({
  books,
  constellationLines: lines,
  onStarClick,
  selectedBookId,
}: {
  books: Book[];
  constellationLines: [string, string][];
  onStarClick: (book: Book) => void;
  selectedBookId: string | null;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 100 }}
        style={{ background: "#020617" }}
        gl={{ antialias: true }}
      >
        {/* Far field stars */}
        <Stars
          radius={80}
          depth={60}
          count={5000}
          factor={4}
          saturation={0.5}
          fade
          speed={reducedMotion ? 0 : 0.3}
        />
        {/* Near bright stars */}
        <Stars
          radius={22}
          depth={22}
          count={700}
          factor={6}
          saturation={0.9}
          fade
          speed={reducedMotion ? 0 : 0.6}
        />

        {/* Multi-color cosmic dust (additive blending) */}
        <DustCloud
          color="#6366f1"
          count={300}
          speed={reducedMotion ? 0 : 0.007}
          size={0.025}
        />
        <DustCloud
          color="#a855f7"
          count={200}
          speed={reducedMotion ? 0 : 0.011}
          size={0.018}
        />
        <DustCloud
          color="#ec4899"
          count={120}
          speed={reducedMotion ? 0 : 0.005}
          size={0.014}
        />
        <DustCloud
          color="#3b82f6"
          count={180}
          speed={reducedMotion ? 0 : 0.009}
          size={0.02}
        />

        <ConstellationLines books={books} lines={lines} />

        {books.map((book) => (
          <BookStar
            key={book.id}
            book={book}
            onClick={onStarClick}
            isSelected={selectedBookId === book.id}
            reducedMotion={reducedMotion}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={3}
          maxDistance={20}
          enablePan
        />
      </Canvas>
    </div>
  );
}
