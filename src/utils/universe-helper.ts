import type { Book } from "@/types/library";

export const STAR_SCALE = {
  completed: 0.24,
  reading: 0.17,
  unread: 0.1,
} as const;
export const SPIKE_SIZE = {
  completed: 1.2,
  reading: 0.8,
  unread: 0.42,
} as const;

export const GLOW_RATIO = { inner: 3.5, mid: 8.5, outer: 20 } as const;
export const GLOW_OPACITY_BASE = { outer: 0.08, mid: 0.2, inner: 0.6 } as const;
// biome-ignore format:off
export const GLOW_OPACITY_UNREAD = { outer: 0.04, mid: 0.09, inner: 0.22 } as const;

export const SPIKE_OPACITY = { base: 0.7, unread: 0.28 } as const;

/**
 * @param id - 本のID
 * @returns 本のIDを元に生成されたシード値
 * @description 本のIDを元にシード値を生成する関数。シード値は、IDの文字コードの合計に基づいて計算されます。
 */
export function bookSeed(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 2.3 + 1;
}

/**
 * @param status - 本のステータス（"completed"、"reading"、"unread"のいずれか）
 * @returns 本のステータスに基づいて、星のビジュアル要素を計算して返すオブジェクト
 * @description 本のステータスに応じて、星のコアのスケール、スパイクのサイズ、グローのサイズと不透明度を計算する関数。
 ステータスが"unread"の場合は、グローとスパイクの不透明度が低くなります。
 */
export function starVisuals(status: Book["status"]) {
  const coreScale = STAR_SCALE[status];
  const spikeSize = SPIKE_SIZE[status];
  const isUnread = status === "unread";
  return {
    coreScale,
    spikeSize,
    glowInner: coreScale * GLOW_RATIO.inner,
    glowMid: coreScale * GLOW_RATIO.mid,
    glowOuter: coreScale * GLOW_RATIO.outer,
    glowOpacity: isUnread ? GLOW_OPACITY_UNREAD : GLOW_OPACITY_BASE,
    spikeOpacity: isUnread ? SPIKE_OPACITY.unread : SPIKE_OPACITY.base,
  };
}
