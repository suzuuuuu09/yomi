export const STAR_SCALE = { completed: 0.28, unread: 0.1 } as const;
export const SPIKE_SIZE = { completed: 1.15, unread: 0.16 } as const;

export const GLOW_RATIO = { inner: 3.5, mid: 8.5, outer: 20 } as const;
export const GLOW_OPACITY_BASE = {
  outer: 0.08,
  mid: 0.22,
  inner: 0.66,
} as const;
// biome-ignore format:off
export const GLOW_OPACITY_UNREAD = { outer: 0.025, mid: 0.05, inner: 0.13 } as const;

export const SPIKE_OPACITY = { base: 0.72, unread: 0.04 } as const;
export const CORE_OPACITY = { completed: 1, unread: 0.42 } as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * @param id - 本のID
 * @returns 本のIDを元に生成されたシード値
 * @description 本のIDを元にシード値を生成する関数。シード値は、IDの文字コードの合計に基づいて計算されます。
 */
export function bookSeed(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 2.3 + 1;
}

/**
 * @param progress - 読書進捗率（0.0 = 未読、1.0 = 読了）
 * @returns 進捗率に応じて線形補間された星のビジュアル要素
 * @description 読書進捗に応じて星のコアスケール、スパイクサイズ、グローと不透明度を計算する。
 * progress が増加するほど星は明るく大きくなる。
 */
export function starVisuals(progress: number) {
  const t = clampProgress(progress);
  const coreScale = lerp(STAR_SCALE.unread, STAR_SCALE.completed, t);
  const spikeSize = lerp(SPIKE_SIZE.unread, SPIKE_SIZE.completed, t);
  const glowOpacity = {
    outer: lerp(GLOW_OPACITY_UNREAD.outer, GLOW_OPACITY_BASE.outer, t),
    mid: lerp(GLOW_OPACITY_UNREAD.mid, GLOW_OPACITY_BASE.mid, t),
    inner: lerp(GLOW_OPACITY_UNREAD.inner, GLOW_OPACITY_BASE.inner, t),
  };
  const spikeOpacity = lerp(SPIKE_OPACITY.unread, SPIKE_OPACITY.base, t);
  const coreOpacity = lerp(CORE_OPACITY.unread, CORE_OPACITY.completed, t);
  return {
    coreScale,
    coreOpacity,
    spikeSize,
    glowInner: coreScale * GLOW_RATIO.inner,
    glowMid: coreScale * GLOW_RATIO.mid,
    glowOuter: coreScale * GLOW_RATIO.outer,
    glowOpacity,
    spikeOpacity,
  };
}
