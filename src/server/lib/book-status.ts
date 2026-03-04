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
