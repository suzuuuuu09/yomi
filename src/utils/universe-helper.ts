export const STAR_SCALE = { completed: 0.24, unread: 0.1 } as const;
export const SPIKE_SIZE = { completed: 1.2, unread: 0.42 } as const;

export const GLOW_RATIO = { inner: 3.5, mid: 8.5, outer: 20 } as const;
export const GLOW_OPACITY_BASE = { outer: 0.08, mid: 0.2, inner: 0.6 } as const;
// biome-ignore format:off
export const GLOW_OPACITY_UNREAD = { outer: 0.04, mid: 0.09, inner: 0.22 } as const;

export const SPIKE_OPACITY = { base: 0.7, unread: 0.28 } as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
  const coreScale = lerp(STAR_SCALE.unread, STAR_SCALE.completed, progress);
  const spikeSize = lerp(SPIKE_SIZE.unread, SPIKE_SIZE.completed, progress);
  const glowOpacity = {
    outer: lerp(GLOW_OPACITY_UNREAD.outer, GLOW_OPACITY_BASE.outer, progress),
    mid: lerp(GLOW_OPACITY_UNREAD.mid, GLOW_OPACITY_BASE.mid, progress),
    inner: lerp(GLOW_OPACITY_UNREAD.inner, GLOW_OPACITY_BASE.inner, progress),
  };
  const spikeOpacity = lerp(SPIKE_OPACITY.unread, SPIKE_OPACITY.base, progress);
  return {
    coreScale,
    spikeSize,
    glowInner: coreScale * GLOW_RATIO.inner,
    glowMid: coreScale * GLOW_RATIO.mid,
    glowOuter: coreScale * GLOW_RATIO.outer,
    glowOpacity,
    spikeOpacity,
  };
}
