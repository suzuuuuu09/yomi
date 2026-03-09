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
import { bookSeed } from "@/utils/universe-helper";
import { starVisuals } from "@/utils/universe-helper";
import { useGyroPermission } from "@/hooks/useGyroPermission";
import { getGlowTex } from "@/lib/universe-texture";

export const DUST_CLOUDS = [
  { color: "#6366f1", count: 300, speed: 0.007, size: 0.025 },
  { color: "#a855f7", count: 200, speed: 0.011, size: 0.018 },
  { color: "#ec4899", count: 120, speed: 0.005, size: 0.014 },
  { color: "#3b82f6", count: 180, speed: 0.009, size: 0.02 },
] as const;

// 星の生成エフェクト
const BIRTH_EFFECT_COUNT = 60;
const BIRTH_EFFECT_DURATION = 1.5;
/** スパイク平面の [幅比率, 高さ比率, Z回転角] テーブル */
export const SPIKE_PLANE_RATIOS = [
  [1, 0.018, 0],
  [0.018, 1, 0],
  [0.6, 0.012, Math.PI / 4],
  [0.6, 0.012, -Math.PI / 4],
] as const;

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

  const geos = useMemo(
    () =>
      SPIKE_PLANE_RATIOS.map(
        ([w, h]) => new THREE.PlaneGeometry(size * w, size * h),
      ),
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
      {SPIKE_PLANE_RATIOS.map(([, , rotZ], i) => (
        <mesh
          key={i}
          geometry={geos[i]}
          material={mat}
          rotation={[0, 0, rotZ]}
        />
      ))}
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

  const isReading = book.status === "reading";
  const isUnread = book.status === "unread";

  const {
    coreScale,
    spikeSize,
    glowInner,
    glowMid,
    glowOuter,
    glowOpacity,
    spikeOpacity,
  } = starVisuals(book.status);

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

  const seed = useMemo(() => bookSeed(book.id), [book.id]);

  useFrame((state) => {
    if (!groupRef.current || !coreRef.current || reducedMotion) return;

    const t = state.clock.elapsedTime;

    // selected > reading の優先順位でスケールアニメーション
    if (isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
    } else if (isReading) {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 2.2 + seed) * 0.18);
    }

    if (isUnread) {
      const flicker =
        0.35 +
        Math.abs(Math.sin(t * 0.85 + seed)) * 0.35 +
        Math.abs(Math.sin(t * 2.9 + seed * 0.7)) * 0.15;
      (coreRef.current.material as THREE.SpriteMaterial).opacity = flicker;
    }
  });

  return (
    <group ref={groupRef} position={book.position}>
      <GlowSprite
        color={book.color}
        scale={glowOuter}
        opacity={glowOpacity.outer}
      />
      <GlowSprite
        color={book.color}
        scale={glowMid}
        opacity={glowOpacity.mid}
      />
      <GlowSprite
        color={book.color}
        scale={glowInner}
        opacity={glowOpacity.inner}
      />

      <StarSpikes color={book.color} size={spikeSize} opacity={spikeOpacity} />

      <sprite
        ref={coreRef}
        material={coreMat}
        scale={[coreScale, coreScale, 1]}
      />

      {isSelected && (
        <>
          <GlowSprite color="#ffffff" scale={glowMid * 2.0} opacity={0.22} />
          <GlowSprite color={book.color} scale={glowMid * 1.3} opacity={0.4} />
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
    const makeLineMat = (color: string, opacity: number) =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

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
        const geo = () => new THREE.BufferGeometry().setFromPoints(pts);

        return {
          main: new THREE.Line(geo(), makeLineMat(from.color, 0.6)),
          glow: new THREE.Line(geo(), makeLineMat(from.color, 0.22)),
        };
      })
      .filter(Boolean) as { main: THREE.Line; glow: THREE.Line }[];
  }, [books, lines]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
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
      // biome-ignore format:off
      pos[i * 3]     = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * speed;
      ref.current.rotation.x = clock.elapsedTime * speed * 0.43;
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

  const velocities = useMemo(() => {
    const pos = new Float32Array(BIRTH_EFFECT_COUNT * 3);
    for (let i = 0; i < BIRTH_EFFECT_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.3 + Math.random() * 0.7;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      pos[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return pos;
  }, []);

  const initialPositions = useMemo(
    () => new Float32Array(velocities),
    [velocities],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startTime.current === null) startTime.current = clock.elapsedTime;

    const progress = Math.min(
      (clock.elapsedTime - startTime.current) / BIRTH_EFFECT_DURATION,
      1,
    );

    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < BIRTH_EFFECT_COUNT; i++) {
      posAttr.setXYZ(
        i,
        position[0] + initialPositions[i * 3] * progress * 2,
        position[1] + initialPositions[i * 3 + 1] * progress * 2,
        position[2] + initialPositions[i * 3 + 2] * progress * 2,
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
        <bufferAttribute attach="attributes-position" args={[velocities, 3]} />
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

type ControlsRef = React.RefObject<{
  target: THREE.Vector3;
  update: () => void;
} | null>;

function CameraSetup({
  books,
  controlsRef,
  vrMode,
  gyroGranted,
}: {
  books: Book[];
  controlsRef: ControlsRef;
  vrMode: boolean;
  gyroGranted: boolean;
}) {
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const vrPositioned = useRef(false);

  // 重心と分布半径を計算するユーティリティ
  const computeBounds = useCallback(() => {
    const n = books.length;

    if (n === 0) return { cx: 0, cy: 0, cz: 0, radius: 1 }; // 欲がないときは原点

    const cx = books.reduce((sum, b) => sum + b.position[0], 0) / n;
    const cy = books.reduce((sum, b) => sum + b.position[1], 0) / n;
    const cz = books.reduce((sum, b) => sum + b.position[2], 0) / n;
    /* let cx = 0,
      cy = 0,
      cz = 0; */
    const radius = books.reduce((max, b) => {
      const d = Math.hypot(
        b.position[0] - cx,
        b.position[1] - cy,
        b.position[2] - cz,
      );
      return Math.max(max, d);
    }, 0);
    return { cx, cy, cz, radius };
  }, [books]);

  // 通常モードの初期カメラ配置
  useEffect(() => {
    if (initialized.current || books.length === 0) return;
    initialized.current = true;

    const { cx, cy, cz, radius } = computeBounds();
    const r = Math.max(radius + 2.5, 4);
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const hFovRad =
      2 * Math.atan(Math.tan(fovRad / 2) * (size.width / size.height));
    const distance = Math.min(
      Math.max(r / Math.tan(fovRad / 2), r / Math.tan(hFovRad / 2)) * 1.15,
      38,
    );

    camera.position.set(cx, cy, cz + distance);
    camera.lookAt(cx, cy, cz);
    controlsRef.current?.target.set(cx, cy, cz);
    controlsRef.current?.update();
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
    const vrDist = Math.min(Math.max(radius * 0.45, 3), 12);
    camera.position.set(cx, cy, cz + vrDist);
    camera.lookAt(cx, cy, cz);
  }, [vrMode, gyroGranted, books, camera, computeBounds]);

  return null;
}

function GyroPermissionOverlay({ onGranted }: { onGranted: () => void }) {
  const { needsPrompt, requestPermission } = useGyroPermission(true);

  useEffect(() => {
    if (!needsPrompt) onGranted();
  }, [needsPrompt, onGranted]);

  if (!needsPrompt) return null;

  const handleClick = async () => {
    await requestPermission();
    onGranted();
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
        onClick={handleClick}
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

interface UniverseCanvasProps {
  books: Book[];
  constellationLines: [string, string][];
  onStarClick: (book: Book) => void;
  selectedBookId: string | null;
  newlyAddedBookId: string | null;
  onBirthEffectComplete: () => void;
  vrMode?: boolean;
}

export default function UniverseCanvas({
  books,
  constellationLines: lines,
  onStarClick,
  selectedBookId,
  newlyAddedBookId,
  onBirthEffectComplete,
  vrMode = false,
}: UniverseCanvasProps) {
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

  const motionSpeed = useCallback(
    (base: number) => (reducedMotion ? 0 : base),
    [reducedMotion],
  );

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
          speed={motionSpeed(0.3)}
        />
        <Stars
          radius={22}
          depth={22}
          count={700}
          factor={6}
          saturation={0.9}
          fade
          speed={motionSpeed(0.6)}
        />

        {DUST_CLOUDS.map(({ color, count, speed, size }) => (
          <DustCloud
            key={color}
            color={color}
            count={count}
            speed={motionSpeed(speed)}
            size={size}
          />
        ))}

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
            makeDefault
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
