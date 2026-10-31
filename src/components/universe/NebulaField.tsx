"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function NebulaField({
  reducedMotion = false,
  empty = false,
}: {
  reducedMotion?: boolean;
  empty?: boolean;
}) {
  const texture = useTexture("/textures/ambient-dust.png");
  const group = useRef<THREE.Group>(null);

  useFrame(({ camera, viewport, clock }) => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    const distance = 44;
    const height =
      2 *
      distance *
      Math.tan(
        THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2),
      );
    group.current.scale.set(height * viewport.aspect, height, 1);
    if (!reducedMotion)
      group.current.rotation.z += Math.sin(clock.elapsedTime * 0.08) * 0.015;
  });

  return (
    <group ref={group}>
      <mesh position={[-0.5, -0.3, -44]} scale={[0.85, 0.85, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          map={texture}
          color="#558bff"
          transparent
          opacity={empty ? 0.22 : 0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[0.48, 0.4, -44]}
        scale={[0.7, 0.7, 1]}
        rotation={[0, 0, Math.PI]}
      >
        <planeGeometry />
        <meshBasicMaterial
          map={texture}
          color="#8d6bff"
          transparent
          opacity={empty ? 0.18 : 0.36}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
