import * as THREE from "three";

const GLOW_TEX_SIZE = 128;

let _glowTex: THREE.CanvasTexture | null = null;

/**
 * 放射状グラデーションの Glow テクスチャを返す。
 * 全コンポーネントで共有されるモジュールスコープのシングルトン。
 */
export function getGlowTex(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;

  const s = GLOW_TEX_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.06, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  _glowTex = new THREE.CanvasTexture(canvas);

  return _glowTex;
}
