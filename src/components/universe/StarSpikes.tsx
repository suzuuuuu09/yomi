"use client";

import { useTexture } from "@react-three/drei";
import { AdditiveBlending } from "three";

export default function StarSpikes({
  color,
  size,
  opacity,
}: {
  color: string;
  size: number;
  opacity: number;
}) {
  const texture = useTexture("/textures/book-star.png");
  return (
    <sprite scale={[size * 2, size * 2, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
