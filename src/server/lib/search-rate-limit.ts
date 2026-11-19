import { getDBFromContext } from "@/server/lib/db";

export async function allowBookSearch(address: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(address),
  );
  const key = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const db = getDBFromContext().$client;
  const increment = (key: string) =>
    db
      .prepare(
        "INSERT INTO search_rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window = excluded.window, count = CASE WHEN search_rate_limits.window = excluded.window THEN search_rate_limits.count + 1 ELSE 1 END RETURNING count",
      )
      .bind(key, window);
  const results = await db.batch<{ count: number }>([
    increment(`address:${key}`),
    increment("global"),
    db
      .prepare("DELETE FROM search_rate_limits WHERE window < ?")
      .bind(window - 1),
  ]);
  return (
    Number(results[0].results[0]?.count) <= 30 &&
    Number(results[1].results[0]?.count) <= 300
  );
}
