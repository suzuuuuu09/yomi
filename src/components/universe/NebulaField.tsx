"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const clouds: {
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: number;
}[] = [
  {
    name: "blue",
    position: [-15, -7, -8],
    scale: [19, 14, 12],
    rotation: -0.3,
  },
  {
    name: "violet",
    position: [16, 10, -16],
    scale: [18, 12, 14],
    rotation: 2.5,
  },
];

const vertexShader = `
  out vec3 localOrigin;
  out vec3 localPosition;

  void main() {
    localOrigin = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    localPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// shortcut: 単一画像から雲の厚みを補間する, 視点ごとに固有の雲形が必要なら3D密度素材へ置き換える。
const fragmentShader = `
  uniform sampler2D dust;
  uniform float time;
  uniform float strength;
  in vec3 localOrigin;
  in vec3 localPosition;
  out vec4 cloudColor;

  void main() {
    vec3 direction = normalize(localPosition - localOrigin);
    float b = dot(localOrigin, direction);
    float discriminant = b * b - dot(localOrigin, localOrigin) + 1.0;
    if (discriminant <= 0.0) discard;

    float start = max(0.0, -b - sqrt(discriminant));
    float end = -b + sqrt(discriminant);
    float stepSize = (end - start) / 32.0;
    vec3 emission = vec3(0.0);

    // 奥行きごとに元画像の参照位置と密度を変え、平面の積層に見せない。
    for (int i = 0; i < 32; i++) {
      vec3 p = localOrigin + direction * (start + (float(i) + 0.5) * stepSize);
      vec2 flow = sin(p.yz * 5.0 + time) * cos(p.zx * 4.0 - time);
      vec2 uv = p.xy * 0.48 + 0.5 + p.z * vec2(0.045, -0.035) + flow * 0.015;
      vec3 sampleColor = texture(dust, clamp(uv, 0.0, 1.0)).rgb;
      float edge = 1.0 - smoothstep(0.45, 1.0, length(p));
      float density = 0.65 + 0.35 * sin(p.z * 11.0 + p.x * 5.0 + time);
      emission += sampleColor * edge * density * stepSize;
    }

    cloudColor = vec4(emission * strength, 1.0);
  }
`;

export default function NebulaField({
  reducedMotion = false,
  empty = false,
}: {
  reducedMotion?: boolean;
  empty?: boolean;
}) {
  const texture = useTexture("/textures/ambient-dust.png");
  const uniforms = useMemo(
    () => ({
      dust: { value: texture },
      time: { value: 0 },
      strength: { value: empty ? 0.65 : 1.0 },
    }),
    [texture, empty],
  );

  useFrame((_, delta) => {
    if (!reducedMotion) uniforms.time.value += delta * 0.025;
  });

  return (
    <group name="nebula-field">
      {clouds.map(({ name, position, scale, rotation }) => (
        <mesh
          key={name}
          name={`nebula-volume-${name}`}
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
