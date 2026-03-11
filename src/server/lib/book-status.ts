import type { BookStatus } from "@/types/library";
/**
 * 現在のページ数から、読書のステータスを返す関数
 * @param currentPage 現在のページ数
 * @param totalPage 本の総ページ数
 * @returns "unread"（未読）, "reading"（読書中）, "completed"（読了）
 */
export function pageToStatus(
  currentPage: number,
  totalPage: number,
): BookStatus {
  if (currentPage <= 0) return "unread";

  if (currentPage >= totalPage && totalPage > 0) return "completed";

  return "reading";
}

/**
 * ステータスの変更に応じて、completedAt を適切に更新する関数。
 * - newStatus が "completed" で prevStatus が "completed" でない場合、現在の日時を completedAt に設定。
 * - newStatus が "completed" でない場合、completedAt を null にリセット。
 * - それ以外の場合は、currentCompletedAt を変更せずに返す。
 * @param newStatus - 新しいステータス
 * @param prevStatus - 前のステータス
 * @param now - 現在の日時（ISO 8601形式）
 * @param currentCompletedAt - 現在の completedAt の値（ISO 8601形式または null）
 * @returns 新しい completedAt の値（ISO 8601形式または null）
 */
export function resolveCompletedAt(
  newStatus: BookStatus,
  prevStatus: BookStatus,
  now: string,
  currentCompletedAt: string | null,
): string | null {
  if (newStatus === "completed" && prevStatus !== "completed") return now;
  if (newStatus !== "completed" && prevStatus === "completed") return null;
  return currentCompletedAt; // 変更しない
}
