"use client";

import {
  DeviceOrientationControls,
  OrbitControls,
  Stars,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Book } from "@/types/library";

// Glowのテクスチャは全ての星で共通なので，最初の呼び出し時に1回だけ生成してキャッシュする
let _glowTex: THREE.CanvasTexture | null = null;
function getGlowTex(): THREE.CanvasTexture {
  // すでに生成されていればキャッシュを返す
  if (_glowTex) return _glowTex;

  // グラデーションで中心が白く、外に行くほど透明になるテクスチャを生成
  const s = 128;

  // キャンバスを作成
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
  // キャンバスからテクスチャを作成してキャッシュ
  _glowTex = new THREE.CanvasTexture(c);

  return _glowTex;
}

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
    const seed =
      book.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 2.3 + 1;

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

      <StarSpikes
        color={book.color}
        size={spikeSize}
        opacity={isUnread ? 0.28 : 0.7}
      />

      <sprite
        ref={coreRef}
        material={coreMat}
        scale={[coreScale, coreScale, 1]}
      />

      {isSelected && (
        <>
          <GlowSprite color="#ffffff" scale={glow2 * 2.0} opacity={0.22} />
          <GlowSprite color={book.color} scale={glow2 * 1.3} opacity={0.4} />
          <StarSpikes color="#ffffff" size={spikeSize * 2.0} opacity={0.55} />
        </>
      )}

      {isReading && (
        <OrbitRing color={book.color} radius={coreScale * 3.2} opacity={0.6} />
      )}

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

        const pts = [
          new THREE.Vector3(...from.position),
          new THREE.Vector3(...to.position),
        ];

        // メイン線
        const mainGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const mainMat = new THREE.LineBasicMaterial({
          color: from.color,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        // グロー線
        const glowGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const glowMat = new THREE.LineBasicMaterial({
          color: from.color,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        return {
          main: new THREE.Line(mainGeo, mainMat),
          glow: new THREE.Line(glowGeo, glowMat),
        };
      })
      .filter(Boolean) as { main: THREE.Line; glow: THREE.Line }[];
  }, [books, lines]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lineObjects.forEach(({ main, glow }, i) => {
      const pulse = 0.48 + Math.sin(t * 0.6 + i * 1.4) * 0.18;
      (main.material as THREE.LineBasicMaterial).opacity = pulse;
      (glow.material as THREE.LineBasicMaterial).opacity = pulse * 0.38;
    });
  });

  return (
    <>
      {lineObjects.map(({ main, glow }, i) => (
        <group key={i}>
          <primitive object={main} />
          <primitive object={glow} />
        </group>
      ))}
    </>
  );
}

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
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
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

function StarBirthEffect({
  position,
  color,
  onComplete,
}: {
  position: [number, number, number];
  color: string;
  onComplete: () => void;
}) {
  const ref = useRef<THREE.Points>(null);
  const startTime = useRef<number | null>(null);
  const DURATION = 1.5;
  const COUNT = 60;

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.3 + Math.random() * 0.7;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      pos[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return pos;
  }, []);

  const basePositions = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!ref.current) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / DURATION, 1);

    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      posAttr.setXYZ(
        i,
        position[0] + basePositions[i * 3] * progress * 2,
        position[1] + basePositions[i * 3 + 1] * progress * 2,
        position[2] + basePositions[i * 3 + 2] * progress * 2,
      );
    }
    posAttr.needsUpdate = true;

    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - progress * progress;
    mat.size = 0.06 * (1 - progress * 0.5);

    if (progress >= 1) onComplete();
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CameraSetup({
  books,
  controlsRef,
  vrMode,
  gyroGranted,
}: {
  books: Book[];
  controlsRef: React.RefObject<{
    target: THREE.Vector3;
    update: () => void;
  } | null>;
  vrMode: boolean;
  gyroGranted: boolean;
}) {
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const vrPositioned = useRef(false);

  // 重心と分布半径を計算するユーティリティ
  const computeBounds = useCallback(() => {
    let cx = 0,
      cy = 0,
      cz = 0;
    for (const b of books) {
      cx += b.position[0];
      cy += b.position[1];
      cz += b.position[2];
    }
    cx /= books.length;
    cy /= books.length;
    cz /= books.length;
    let radius = 0;
    for (const b of books) {
      const d = Math.hypot(
        b.position[0] - cx,
        b.position[1] - cy,
        b.position[2] - cz,
      );
      if (d > radius) radius = d;
    }
    return { cx, cy, cz, radius };
  }, [books]);

  // 通常モードの初期カメラ配置
  useEffect(() => {
    if (initialized.current || books.length === 0) return;
    initialized.current = true;

    const { cx, cy, cz, radius } = computeBounds();
    const r = Math.max(radius + 2.5, 4);

    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);

    const distV = r / Math.tan(fovRad / 2);
    const distH = r / Math.tan(hFovRad / 2);
    const distance = Math.min(Math.max(distV, distH) * 1.15, 38);

    camera.position.set(cx, cy, cz + distance);
    camera.lookAt(cx, cy, cz);

    if (controlsRef.current) {
      controlsRef.current.target.set(cx, cy, cz);
      controlsRef.current.update();
    }
  }, [books, camera, size, controlsRef, computeBounds]);

  // VRモード時のカメラ配置: 全体を適度に俯瞰できる位置へ
  useEffect(() => {
    if (!vrMode || !gyroGranted || books.length === 0) {
      vrPositioned.current = false;
      return;
    }
    if (vrPositioned.current) return;
    vrPositioned.current = true;

    const { cx, cy, cz, radius } = computeBounds();
    // 星の分布半径の45%ほどの距離に立つ。
    // 近すぎず遠すぎない没入感のある位置（最低3、最大12）
    const vrDist = Math.min(Math.max(radius * 0.45, 3), 12);
    camera.position.set(cx, cy, cz + vrDist);
    camera.lookAt(cx, cy, cz);
  }, [vrMode, gyroGranted, books, camera, computeBounds]);

  return null;
}

function GyroPermissionOverlay({ onGranted }: { onGranted: () => void }) {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    type DeviceOrientationEventiOS = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const DOE = DeviceOrientationEvent as DeviceOrientationEventiOS;

    if (typeof DOE.requestPermission === "function") {
      setNeeded(true); // iOS 13+
    } else {
      onGranted(); // Android / PC
    }
  }, [onGranted]);

  if (!needed) return null;

  const handleRequest = async () => {
    // iOS 13+ での許可リクエスト
    type DeviceOrientationEventiOS = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const DOE = DeviceOrientationEvent as DeviceOrientationEventiOS;
    const result = await DOE.requestPermission?.();

    if (result === "granted") {
      setNeeded(false);
      onGranted();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.93)",
        color: "white",
        gap: 20,
      }}
    >
      <p
        style={{
          fontSize: 18,
          textAlign: "center",
          padding: "0 32px",
          lineHeight: 1.7,
        }}
      >
        🌌 宇宙を見渡すには
        <br />
        センサーの許可が必要です
      </p>
      <button
        type="button"
        onClick={handleRequest}
        style={{
          padding: "14px 36px",
          borderRadius: 9999,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          border: "none",
          color: "white",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        センサーを有効にする
      </button>
    </div>
  );
}

export default function UniverseCanvas({
  books,
  constellationLines: lines,
  onStarClick,
  selectedBookId,
  newlyAddedBookId,
  onBirthEffectComplete,
  vrMode = false,
}: {
  books: Book[];
  constellationLines: [string, string][];
  onStarClick: (book: Book) => void;
  selectedBookId: string | null;
  newlyAddedBookId: string | null;
  onBirthEffectComplete: () => void;
  vrMode?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const controlsRef = useRef<{
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);
  const [gyroGranted, setGyroGranted] = useState(false);

  // VRモードを抜けたらジャイロ許可状態をリセット
  useEffect(() => {
    if (!vrMode) setGyroGranted(false);
  }, [vrMode]);

  const newBook = newlyAddedBookId
    ? books.find((b) => b.id === newlyAddedBookId)
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {/* iOSジャイロ許可オーバーレイ（VRモード時のみ） */}
      {vrMode && !gyroGranted && (
        <GyroPermissionOverlay onGranted={() => setGyroGranted(true)} />
      )}

      <Canvas
        camera={{ position: [0, 2, 20], fov: 60, near: 0.1, far: 100 }}
        style={{ background: "#020617" }}
        gl={{ antialias: true }}
      >
        <Stars
          radius={80}
          depth={60}
          count={5000}
          factor={4}
          saturation={0.5}
          fade
          speed={reducedMotion ? 0 : 0.3}
        />
        <Stars
          radius={22}
          depth={22}
          count={700}
          factor={6}
          saturation={0.9}
          fade
          speed={reducedMotion ? 0 : 0.6}
        />

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

        {newBook && !reducedMotion && (
          <StarBirthEffect
            key={newBook.id}
            position={newBook.position}
            color={newBook.color}
            onComplete={onBirthEffectComplete}
          />
        )}

        {vrMode && gyroGranted ? (
          <DeviceOrientationControls makeDefault />
        ) : (
          <OrbitControls
            // biome-ignore lint/suspicious/noExplicitAny: drei ref type
            ref={controlsRef as any}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={3}
            maxDistance={40}
            enablePan
          />
        )}
        <CameraSetup
          books={books}
          controlsRef={controlsRef}
          vrMode={vrMode}
          gyroGranted={gyroGranted}
        />
      </Canvas>
    </div>
  );
}
