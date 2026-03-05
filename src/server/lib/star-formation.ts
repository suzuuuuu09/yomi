/**
 * 星の配置・色・星座線の計算ロジック
 * @see docs/star-formation.md
 */

// 文字列から決定論的なハッシュ値（0〜1）を生成
function hashString(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = Math.trunc(hash);
  }

  return Math.abs(hash) / 2147483647;
}

/**
 * ジャンル名からクラスタ中心の座標を計算する関数
 * @param genre - ジャンル名
 * @returns ジャンルに基づくクラスタ中心の座標 [x, y, z]
 */
function genreClusterCenter(genre: string): [number, number, number] {
  if (!genre) return [0, 0, 0];

  const h1 = hashString(genre);
  const h2 = hashString(`${genre}_y`);
  const h3 = hashString(`${genre}_z`);

  // 空間の範囲で±5程度に分布させり
  return [(h1 - 0.5) * 10, (h2 - 0.5) * 8, (h3 - 0.5) * 10];
}

/**
 * 新しい星の座標を計算する
 * ジャンルのクラスタ中心から ±1.5 でランダム散布し、
 * 既存の星との距離が < 1.0 ならリトライする（最大10回）
 */
export function computePosition(
  genre: string,
  existingPositions: [number, number, number][],
): [number, number, number] {
  const [cx, cy, cz] = genreClusterCenter(genre);
  const scatter = 1.5;
  const minDistance = 1;
  const maxRetries = 10;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const x = cx + (Math.random() - 0.5) * 2 * scatter;
    const y = cy + (Math.random() - 0.5) * 2 * scatter;
    const z = cz + (Math.random() - 0.5) * 2 * scatter;

    const tooClose = existingPositions.some(([ex, ey, ez]) => {
      const dx = x - ex;
      const dy = y - ey;
      const dz = z - ez;
      return Math.hypot(dx, dy, dz) < minDistance;
    });

    if (!tooClose || attempt === maxRetries - 1) {
      return [x, y, z];
    }
  }

  // 念のため
  return [cx, cy, cz];
}

// ジャンル名から色相を決定（0〜360）
function genreHue(genre: string): number {
  if (!genre) return 240; // 青系

  return Math.round(hashString(genre) * 360);
}

// 進捗に応じた明るさを計算（0.15〜0.9）
export function computeBrightness(
  currentPage: number,
  totalPages: number,
): number {
  if (totalPages <= 0) return 0.15;
  const progress = Math.min(currentPage / totalPages, 1);

  return 0.15 + progress * 0.75;
}

/**
 * 星の色を HSL 形式で計算
 * H: ジャンルから決定論的, S: 70%, L: brightness に応じて 35%〜75%
 */
export function computeColor(genre: string, brightness: number): string {
  const h = genreHue(genre);
  const s = 70;
  const l = Math.round(35 + brightness * (75 - 35));

  return `hsl(${h}, ${s}%, ${l}%)`;
}

interface StarInfo {
  id: string;
  status: string;
  genre: string;
  positionX: number;
  positionY: number;
  positionZ: number;
}

/**
 * 星座の線を計算する
 * 条件: 両方 completed, 同じ genre, 3D距離 < 4.0
 */
export function computeConstellationLines(
  stars: StarInfo[],
): [string, string][] {
  const completed = stars.filter((s) => s.status === "completed");
  const lines: [string, string][] = [];

  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      const a = completed[i];
      const b = completed[j];
      if (a.genre !== b.genre || !a.genre) continue;

      const dx = a.positionX - b.positionX;
      const dy = a.positionY - b.positionY;
      const dz = a.positionZ - b.positionZ;
      const dist = Math.hypot(dx, dy, dz);

      if (dist < 4) {
        lines.push([a.id, b.id]);
      }
    }
  }

  return lines;
}
