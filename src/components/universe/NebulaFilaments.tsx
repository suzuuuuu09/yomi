"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const volumes = [
  { position: [-19, 0, -15], scale: [14, 30, 2], rotation: 0.7 },
  { position: [20, 1, -16], scale: [15, 31, 2.5], rotation: 0.6 },
  { position: [1, -18, -20], scale: [29, 13, 2], rotation: -0.5 },
] satisfies {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
}[];

const vertexShader = `
  out vec3 origin;
  out vec3 surface;
  void main() {
    origin = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    surface = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D filaments;
  uniform float time;
  in vec3 origin;
  in vec3 surface;
  out vec4 cloudColor;
  void main() {
    vec3 ray = normalize(surface - origin);
    float b = dot(origin, ray);
    float d = b * b - dot(origin, origin) + 1.0;
    if (d <= 0.0) discard;
    float start = max(0.0, -b - sqrt(d));
    float end = -b + sqrt(d);
    float stepSize = (end - start) / 40.0;
    vec3 emission = vec3(0.0);
    for (int i = 0; i < 40; i++) {
      vec3 p = origin + ray * (start + (float(i) + 0.5) * stepSize);
      vec2 uv = p.xy * 0.5 + 0.5;
      uv += vec2(p.z * 0.001, sin(p.z * 4.0 + time) * 0.001);
      vec4 gas = texture(filaments, clamp(uv, 0.0, 1.0));
      float edge = 1.0 - smoothstep(0.6, 1.0, length(p));
      float depth = 0.55 + 0.45 * sin(p.z * 16.0 + p.x * 7.0 + time);
      float ridge = sin(p.x * 8.0 + sin(p.y * 6.0 + time)) * 0.2;
      float thickness = exp(-pow((p.z - ridge) / 0.14, 2.0));
      emission += gas.rgb * gas.a * edge * depth * thickness * stepSize;
    }
    cloudColor = vec4(emission * 5.0, 1.0);
  }
`;

export default function NebulaFilaments({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const texture = useTexture("/textures/nebula-filaments.png");
  const uniforms = useMemo(
    () => ({ filaments: { value: texture }, time: { value: 0 } }),
    [texture],
  );

  useFrame((_, delta) => {
    if (!reducedMotion) uniforms.time.value += delta * 0.025;
  });

  return (
    <group name="nebula-filaments">
      {volumes.map(({ position, scale, rotation }) => (
        <mesh
          key={position[0]}
          position={position}
          scale={scale}
          rotation={[0, 0, rotation]}
          raycast={() => {}}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <shaderMaterial
            glslVersion={THREE.GLSL3}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            side={THREE.BackSide}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
