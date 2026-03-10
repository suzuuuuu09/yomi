"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SPIKE_PLANE_RATIOS } from "@/consts/universe";

interface StarSpikesProps {
  color: string;
  size: number;
  opacity: number;
}

export default function StarSpikes(props: StarSpikesProps) {
  const { color, size, opacity } = props;
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
      {SPIKE_PLANE_RATIOS.map(([, , rotZ], i) => {
        const key = `spike-${i}`;
        return (
          <mesh
            key={key}
            geometry={geos[i]}
            material={mat}
            rotation={[0, 0, rotZ]}
          />
        );
      })}
    </group>
  );
}
