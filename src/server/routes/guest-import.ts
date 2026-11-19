import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { GuestImportSchema } from "@/lib/guest-schema";
import { apiError, invalidRequest, readJson } from "@/server/lib/api-error";
import { pageToStatus } from "@/server/lib/book-status";
import { getDBFromContext } from "@/server/lib/db";
import { dateToDayNumber, todayInTimeZone } from "@/server/lib/reading-log";
import { getReadingSettings } from "@/server/lib/reading-log-db";
import { authMiddleware } from "@/server/middleware/auth";
import type { AppEnv } from "@/server/types";

const guestImportApp = new OpenAPIHono<AppEnv>();
guestImportApp.use("/*", authMiddleware);
guestImportApp.use(
  "/*",
  bodyLimit({
    maxSize: 4_000_000,
    onError: (c) =>
      apiError(c, 413, "INVALID_REQUEST", "引き継ぐ記録が大きすぎます"),
  }),
);

guestImportApp.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");
  const parsed = GuestImportSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalidRequest(c, parsed.error);
  const source = parsed.data;
  if (source.expectedUserId !== userId)
    return apiError(
      c,
      409,
      "CONFLICT",
      "ログイン中のアカウントが変わりました。画面を再読み込みしてください",
    );
  const book = source.book;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([userId, source.libraryId, book.id]),
    ),
  );
  const id = `guest-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const db = getDBFromContext();
  const saved = await getReadingSettings(db, userId);
  const settings = saved.readingTimezone
    ? { ...saved, readingTimezone: saved.readingTimezone }
    : {
        readingTimezone: source.readingTimezone,
        readingDayOffset: source.readingDayOffset,
        readingTimezoneRevision: source.readingTimezoneRevision,
      };
  const now = new Date();
  const sourceToday =
    dateToDayNumber(todayInTimeZone(source.readingTimezone, now)) +
    source.readingDayOffset;
  const targetToday =
    dateToDayNumber(todayInTimeZone(settings.readingTimezone, now)) +
    settings.readingDayOffset;
  // 過去の読書日の間隔を保ち、引き継ぎ先の「今日」と同じ軸へ移す。
  const revisions = [
    ...new Set(book.logs.map((log) => log.readingTimezoneRevision)),
  ].sort((left, right) => left - right);
  const importedRevisions = new Map(
    revisions.map((revision, index) => [revision, index - revisions.length]),
  );
  const logs = book.logs.map((log) => ({
    ...log,
    readingDay: log.readingDay + targetToday - sourceToday,
    // アカウントの今後の世代（0以上）と同じ日付で衝突させない。
    readingTimezoneRevision: importedRevisions.get(log.readingTimezoneRevision),
  }));
  const binding = db.$client;
  const guard =
    "NOT EXISTS (SELECT 1 FROM guest_book_imports WHERE id = ?) AND EXISTS (SELECT 1 FROM users WHERE id = ? AND reading_timezone = ? AND reading_day_offset = ? AND reading_timezone_revision = ?)";
  const guardValues = [
    id,
    userId,
    settings.readingTimezone,
    settings.readingDayOffset,
    settings.readingTimezoneRevision,
  ];
  const timestamp = now.toISOString();
  const statements = [
    binding
      .prepare(
        "UPDATE users SET reading_timezone = ?, reading_day_offset = ?, reading_timezone_revision = ? WHERE id = ? AND reading_timezone IS NULL",
      )
      .bind(
        settings.readingTimezone,
        settings.readingDayOffset,
        settings.readingTimezoneRevision,
        userId,
      ),
    binding
      .prepare(
        `INSERT INTO books (id, user_id, title, author, isbn, total_pages, current_page, status, genre, cover_url, position_x, position_y, position_z, brightness, color, registered_at, completed_at, archived_at, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`,
      )
      .bind(
        id,
        userId,
        book.title,
        book.author,
        book.isbn,
        book.totalPages,
        book.currentPage,
        pageToStatus(book.currentPage, book.totalPages),
        book.genre,
        book.coverUrl,
        ...book.position,
        book.brightness,
        book.color,
        book.registeredAt,
        book.completedAt,
        book.archivedAt,
        timestamp,
        timestamp,
        ...guardValues,
      ),
    binding
      .prepare(
        `INSERT INTO reading_notes (id, book_id, user_id, content, page, created_at) SELECT ? || ':' || json_extract(value, '$.id'), ?, ?, json_extract(value, '$.content'), json_extract(value, '$.page'), json_extract(value, '$.createdAt') FROM json_each(?) WHERE ${guard}`,
      )
      .bind(id, id, userId, JSON.stringify(book.notes), ...guardValues),
    binding
      .prepare(
        `INSERT INTO reading_logs (id, book_id, user_id, pages_read, date, reading_day, reading_timezone_revision, created_at) SELECT ? || ':' || json_extract(value, '$.id'), ?, ?, json_extract(value, '$.pagesRead'), json_extract(value, '$.date'), json_extract(value, '$.readingDay'), json_extract(value, '$.readingTimezoneRevision'), ? FROM json_each(?) WHERE ${guard}`,
      )
      .bind(id, id, userId, timestamp, JSON.stringify(logs), ...guardValues),
    // 完全削除後の再試行でも同じ本を再作成しないよう、完了印は本と別に保持する。
    binding
      .prepare(
        `INSERT INTO guest_book_imports (id, user_id) SELECT ?, ? WHERE ${guard}`,
      )
      .bind(id, userId, ...guardValues),
  ];
  await binding.batch(statements);
  const marker = await binding
    .prepare("SELECT id FROM guest_book_imports WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .all();
  if (!marker.results.length)
    return apiError(
      c,
      409,
      "CONFLICT",
      "設定が変更されました。もう一度引き継いでください",
    );
  return c.json({ ok: true });
});

export default guestImportApp;
