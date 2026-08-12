import { OpenAPIHono } from "@hono/zod-openapi";
import { and, asc, eq } from "drizzle-orm";
import { apiError } from "@/server/lib/api-error";
import { getDBFromContext } from "@/server/lib/db";
import {
  aggregateReadingDayNumbers,
  calculateReadingDayStreak,
  dateToDayNumber,
  dayNumberToDate,
  isValidTimeZone,
  todayInTimeZone,
} from "@/server/lib/reading-log";
import {
  getReadingSettings,
  getSavedReadingTimezone,
  saveReadingTimezone,
} from "@/server/lib/reading-log-db";
import { authMiddleware } from "@/server/middleware/auth";
import {
  ReadingLogDateSchema,
  ReadingLogUpdateSchema,
  ReadingTimezoneSchema,
} from "@/server/schemas/books";
import { books, readingLogs } from "@/server/schemas/db";
import type { AppEnv } from "@/server/types";

const readingLogsApp = new OpenAPIHono<AppEnv>();
type Database = Pick<
  ReturnType<typeof getDBFromContext>,
  "select" | "update" | "insert" | "delete"
>;

readingLogsApp.use("/*", authMiddleware);

function invalidRequest(
  c: Parameters<typeof apiError>[0],
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return apiError(
    c,
    400,
    "INVALID_REQUEST",
    "入力値が不正です",
    error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  );
}

function readReadingDayQuery(c: Parameters<typeof apiError>[0]) {
  const raw = c.req.query("readingDay");
  if (raw === undefined) return { value: undefined as number | undefined };
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) return { error: "readingDayが不正です" };
  return { value };
}

function readRevisionQuery(c: Parameters<typeof apiError>[0]) {
  const raw = c.req.query("readingTimezoneRevision");
  if (raw === undefined) return { value: undefined as number | undefined };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    return { error: "readingTimezoneRevisionが不正です" };
  }
  return { value };
}

async function readJson(c: Parameters<typeof apiError>[0]) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

async function readBook(db: Database, userId: string, bookId: string) {
  const rows = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function readDateLogs(
  db: Database,
  userId: string,
  bookId: string,
  date: string,
) {
  return db
    .select()
    .from(readingLogs)
    .where(
      and(
        eq(readingLogs.userId, userId),
        eq(readingLogs.bookId, bookId),
        eq(readingLogs.date, date),
      ),
    )
    .orderBy(asc(readingLogs.readingTimezoneRevision), asc(readingLogs.id));
}

async function readLogById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(readingLogs)
    .where(and(eq(readingLogs.userId, userId), eq(readingLogs.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

async function readAllLogs(db: Database, userId: string) {
  return db
    .select({
      date: readingLogs.date,
      pagesRead: readingLogs.pagesRead,
      readingDay: readingLogs.readingDay,
      readingTimezoneRevision: readingLogs.readingTimezoneRevision,
    })
    .from(readingLogs)
    .where(eq(readingLogs.userId, userId));
}

// 読書設定を取得
readingLogsApp.get("/settings", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");
  const db = getDBFromContext();
  return c.json({
    readingTimezone: await getSavedReadingTimezone(db, user.id),
  });
});

// 読書設定を更新
readingLogsApp.put("/settings", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = ReadingTimezoneSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);
  if (!isValidTimeZone(parsed.data.readingTimezone)) {
    return invalidRequest(c, {
      issues: [
        {
          path: ["readingTimezone"],
          message: "IANAタイムゾーンを指定してください",
        },
      ],
    });
  }

  const db = getDBFromContext();
  try {
    const readingTimezone = await saveReadingTimezone(
      db,
      user.id,
      parsed.data.readingTimezone,
    );
    return c.json({ readingTimezone });
  } catch (error) {
    console.error("Reading timezone update failed", error);
    return apiError(
      c,
      500,
      "INTERNAL_ERROR",
      "読書タイムゾーンを更新できませんでした",
    );
  }
});

// 全冊を集計したReading Graphと連続読書日数を取得
readingLogsApp.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const db = getDBFromContext();
  const settings = await getReadingSettings(db, user.id);
  if (!settings.readingTimezone) {
    return c.json({ days: [], streak: 0, readingTimezone: null });
  }
  const timeZone = settings.readingTimezone;
  const today = todayInTimeZone(timeZone);
  const todayReadingDay = dateToDayNumber(today) + settings.readingDayOffset;
  const dayNumbers = Array.from(
    { length: 14 },
    (_, index) => todayReadingDay - 13 + index,
  );
  const logs = await readAllLogs(db, user.id);
  const fallbackDates = new Map(
    dayNumbers.map((dayNumber) => [
      dayNumber,
      dayNumberToDate(dayNumber - settings.readingDayOffset),
    ]),
  );
  const days = aggregateReadingDayNumbers(logs, dayNumbers, fallbackDates);
  const readingDays = logs
    .filter((log) => log.pagesRead >= 1)
    .map((log) =>
      log.readingDay === null || log.readingDay === undefined
        ? dateToDayNumber(log.date) + settings.readingDayOffset
        : log.readingDay,
    );

  return c.json({
    days,
    streak: calculateReadingDayStreak(readingDays, todayReadingDay),
    readingTimezone: timeZone,
  });
});

// 1冊の読書ログを取得
readingLogsApp.get("/:bookId", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const bookId = c.req.param("bookId");
  const db = getDBFromContext();
  if (!(await readBook(db, user.id, bookId))) {
    return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  }

  const logs = await db
    .select({
      id: readingLogs.id,
      date: readingLogs.date,
      pagesRead: readingLogs.pagesRead,
      readingDay: readingLogs.readingDay,
      readingTimezoneRevision: readingLogs.readingTimezoneRevision,
    })
    .from(readingLogs)
    .where(and(eq(readingLogs.userId, user.id), eq(readingLogs.bookId, bookId)))
    .orderBy(
      asc(readingLogs.date),
      asc(readingLogs.readingTimezoneRevision),
      asc(readingLogs.id),
    );
  return c.json({ logs });
});

// 対象日の読書ログを明示的に編集する。0ページは削除扱いにする。
readingLogsApp.put("/:bookId/:date", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const date = c.req.param("date");
  const dateParsed = ReadingLogDateSchema.safeParse({ date });
  if (!dateParsed.success) return invalidRequest(c, dateParsed.error);
  const rawBody = await readJson(c);
  const parsed = ReadingLogUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const bookId = c.req.param("bookId");
  const db = getDBFromContext();
  if (!(await readBook(db, user.id, bookId))) {
    return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  }

  const settings = await getReadingSettings(db, user.id);
  const requestedReadingDay = parsed.data.readingDay ?? undefined;
  const requestedRevision = parsed.data.readingTimezoneRevision ?? undefined;
  const candidates = await readDateLogs(db, user.id, bookId, date);
  const matching = candidates.filter(
    (log) =>
      (requestedReadingDay === undefined ||
        log.readingDay === requestedReadingDay) &&
      (requestedRevision === undefined ||
        log.readingTimezoneRevision === requestedRevision),
  );
  if (matching.length > 1) {
    return invalidRequest(c, {
      issues: [
        {
          path: ["readingDay"],
          message:
            "同じ日付に複数の読書ログがあるため、論理読書日を指定してください",
        },
      ],
    });
  }
  const existing = matching[0] ?? null;

  try {
    if (parsed.data.pagesRead === 0) {
      if (existing) {
        await db.delete(readingLogs).where(eq(readingLogs.id, existing.id));
      }
      return c.json({ ok: true, log: null });
    }

    if (existing) {
      await db
        .update(readingLogs)
        .set({
          pagesRead: parsed.data.pagesRead,
          readingDay:
            existing.readingDay ??
            dateToDayNumber(date) + settings.readingDayOffset,
        })
        .where(eq(readingLogs.id, existing.id));
    } else {
      if (
        requestedReadingDay !== undefined ||
        requestedRevision !== undefined
      ) {
        return apiError(c, 404, "NOT_FOUND", "対象の読書ログが見つかりません");
      }
      await db.insert(readingLogs).values({
        id: crypto.randomUUID(),
        bookId,
        userId: user.id,
        pagesRead: parsed.data.pagesRead,
        date,
        readingDay: dateToDayNumber(date) + settings.readingDayOffset,
        readingTimezoneRevision: settings.readingTimezoneRevision,
        createdAt: new Date().toISOString(),
      });
    }
    const log = existing
      ? await readLogById(db, user.id, existing.id)
      : (await readDateLogs(db, user.id, bookId, date))[0];
    return c.json({
      ok: true,
      log: log
        ? {
            id: log.id,
            date: log.date,
            pagesRead: log.pagesRead,
            readingDay: log.readingDay,
            readingTimezoneRevision: log.readingTimezoneRevision,
          }
        : null,
    });
  } catch (error) {
    console.error("Reading log update failed", error);
    return apiError(c, 500, "INTERNAL_ERROR", "読書ログを更新できませんでした");
  }
});

// 対象日の読書ログを明示的に削除する
readingLogsApp.delete("/:bookId/:date", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const date = c.req.param("date");
  const dateParsed = ReadingLogDateSchema.safeParse({ date });
  if (!dateParsed.success) return invalidRequest(c, dateParsed.error);
  const readingDayQuery = readReadingDayQuery(c);
  if (readingDayQuery.error) {
    return invalidRequest(c, {
      issues: [{ path: ["readingDay"], message: readingDayQuery.error }],
    });
  }
  const revisionQuery = readRevisionQuery(c);
  if (revisionQuery.error) {
    return invalidRequest(c, {
      issues: [
        {
          path: ["readingTimezoneRevision"],
          message: revisionQuery.error,
        },
      ],
    });
  }
  const bookId = c.req.param("bookId");
  const db = getDBFromContext();
  if (!(await readBook(db, user.id, bookId))) {
    return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  }

  const candidates = await readDateLogs(db, user.id, bookId, date);
  const matching = candidates.filter(
    (log) =>
      (readingDayQuery.value === undefined ||
        log.readingDay === readingDayQuery.value) &&
      (revisionQuery.value === undefined ||
        log.readingTimezoneRevision === revisionQuery.value),
  );
  if (matching.length > 1) {
    return invalidRequest(c, {
      issues: [
        {
          path: ["readingDay"],
          message:
            "同じ日付に複数の読書ログがあるため、論理読書日を指定してください",
        },
      ],
    });
  }
  if (matching[0]) {
    await db.delete(readingLogs).where(eq(readingLogs.id, matching[0].id));
  }
  return c.json({ ok: true });
});

export default readingLogsApp;
