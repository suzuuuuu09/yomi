"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface GlowDef {
  color: string;
  size: number;
  pos: [number, number, number];
  opacity: number;
  breathSpeed: number;
  phase: number;
}

const GLOW_DEFS: GlowDef[] = [
  // 大型バックグラウンドグロー（宇宙の奥行き）
  {
    color: "#4f46e5",
    size: 28,
    pos: [2, -1, -20],
    opacity: 0.22,
    breathSpeed: 0.18,
    phase: 0,
  },
  {
    color: "#7c3aed",
    size: 22,
    pos: [-4, 2, -18],
    opacity: 0.18,
    breathSpeed: 0.22,
    phase: 1.3,
  },
  {
    color: "#be185d",
    size: 18,
    pos: [5, 3, -16],
    opacity: 0.14,
    breathSpeed: 0.15,
    phase: 2.1,
  },
  {
    color: "#1d4ed8",
    size: 32,
    pos: [-2, -3, -22],
    opacity: 0.16,
    breathSpeed: 0.2,
    phase: 0.7,
  },
  // 前景アクセントグロー
  {
    color: "#6d28d9",
    size: 10,
    pos: [1, 1, -8],
    opacity: 0.12,
    breathSpeed: 0.3,
    phase: 1.8,
  },
  {
    color: "#0e7490",
    size: 12,
    pos: [-3, 0, -10],
    opacity: 0.1,
    breathSpeed: 0.25,
    phase: 3.0,
  },

  // ターコイズ・シアン系
  {
    color: "#06b6d4",
    size: 8,
    pos: [7, 4, -12],
    opacity: 0.13,
    breathSpeed: 0.28,
    phase: 0.5,
  },
  {
    color: "#22d3ee",
    size: 6,
    pos: [-6, -4, -9],
    opacity: 0.11,
    breathSpeed: 0.35,
    phase: 2.4,
  },
  {
    color: "#0891b2",
    size: 9,
    pos: [-8, 5, -14],
    opacity: 0.1,
    breathSpeed: 0.2,
    phase: 4.1,
  },
  {
    color: "#67e8f9",
    size: 5,
    pos: [4, -6, -7],
    opacity: 0.09,
    breathSpeed: 0.42,
    phase: 1.1,
  },
];

function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  // biome-ignore lint: no-unnecessary-non-null-assertion
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.6)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.2)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.05)");
  grad.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function GlowBlob({
  color,
  size,
  pos,
  opacity,
  breathSpeed,
  phase,
}: {
  color: string;
  size: number;
  pos: [number, number, number];
  opacity: number;
  breathSpeed: number;
  phase: number;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const texture = useMemo(() => makeGlowTexture(), []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [texture, color, opacity],
  );

  matRef.current = mat;

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.elapsedTime;
    matRef.current.opacity =
      opacity * (0.7 + Math.sin(t * breathSpeed + phase) * 0.3);
  });

  return (
    <mesh position={pos} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

export function NebulaField({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  if (reducedMotion) return null;

  return (
    <group>
      {GLOW_DEFS.map((def, i) => {
        const key = `nebula-glow-${i}`;
        return <GlowBlob key={key} {...def} />;
      })}
    </group>
  );
}

export default NebulaField;
