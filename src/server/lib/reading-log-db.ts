import { and, eq, isNull, type SQL, sql } from "drizzle-orm";
import type { getDBFromContext } from "@/server/lib/db";
import {
  dateInTimeZone,
  dateToDayNumber,
  isValidTimeZone,
  preserveReadingDayOffset,
} from "@/server/lib/reading-log";
import { readingLogs, user } from "@/server/schemas/db";

type Database = Pick<
  ReturnType<typeof getDBFromContext>,
  "select" | "update" | "insert" | "delete"
>;

function changedRows(result: unknown): number | undefined {
  return (result as { meta?: { changes?: number } } | undefined)?.meta?.changes;
}

export interface ReadingSettings {
  readingTimezone: string | null;
  readingDayOffset: number;
  readingTimezoneRevision: number;
}

interface ReadingSettingsRow {
  readingTimezone: string | null;
  readingDayOffset: number;
  readingTimezoneRevision: number;
}

function normalizeReadingSettings(
  row: ReadingSettingsRow | undefined,
): ReadingSettings {
  const value = row?.readingTimezone ?? null;
  return {
    readingTimezone: value && isValidTimeZone(value) ? value : null,
    readingDayOffset:
      typeof row?.readingDayOffset === "number" &&
      Number.isInteger(row.readingDayOffset)
        ? row.readingDayOffset
        : 0,
    readingTimezoneRevision:
      typeof row?.readingTimezoneRevision === "number" &&
      Number.isSafeInteger(row.readingTimezoneRevision) &&
      row.readingTimezoneRevision >= 0
        ? row.readingTimezoneRevision
        : 0,
  };
}

export class MissingReadingTimezoneError extends Error {
  constructor() {
    super("Reading timezone must be set before recording progress");
    this.name = "MissingReadingTimezoneError";
  }
}

export async function getSavedReadingTimezone(
  db: Database,
  userId: string,
): Promise<string | null> {
  const settings = await getReadingSettings(db, userId);
  return settings.readingTimezone;
}

export async function getReadingSettings(
  db: Database,
  userId: string,
): Promise<ReadingSettings> {
  const row = await readReadingSettingsRow(db, userId);
  return normalizeReadingSettings(row);
}

async function readReadingSettingsRow(db: Database, userId: string) {
  const rows = await db
    .select({
      readingTimezone: user.readingTimezone,
      readingDayOffset: user.readingDayOffset,
      readingTimezoneRevision: user.readingTimezoneRevision,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0] as ReadingSettingsRow | undefined;
}

export async function ensureReadingSettings(
  db: Database,
  userId: string,
  candidate?: string,
): Promise<ReadingSettings & { readingTimezone: string }> {
  const raw = await readReadingSettingsRow(db, userId);
  const saved = normalizeReadingSettings(raw);
  if (saved.readingTimezone)
    return saved as ReadingSettings & {
      readingTimezone: string;
    };

  if (!candidate || !isValidTimeZone(candidate)) {
    throw new MissingReadingTimezoneError();
  }
  const next = candidate;
  const timezonePredicate = raw?.readingTimezone
    ? eq(user.readingTimezone, raw.readingTimezone)
    : isNull(user.readingTimezone);
  const result = await db
    .update(user)
    .set({ readingTimezone: next, readingDayOffset: 0, updatedAt: new Date() })
    .where(and(eq(user.id, userId), timezonePredicate));
  if (changedRows(result) === 0) {
    const current = await getReadingSettings(db, userId);
    if (current.readingTimezone) {
      return current as ReadingSettings & { readingTimezone: string };
    }
    throw new MissingReadingTimezoneError();
  }
  return {
    readingTimezone: next,
    readingDayOffset: 0,
    readingTimezoneRevision: 0,
  };
}

export async function saveReadingTimezone(
  db: Database,
  userId: string,
  timeZone: string,
  now = new Date(),
): Promise<string> {
  if (!isValidTimeZone(timeZone)) throw new Error("Invalid timezone");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const raw = await readReadingSettingsRow(db, userId);
    const current = normalizeReadingSettings(raw);
    const sameTimeZone = current.readingTimezone === timeZone;
    const nextOffset = current.readingTimezone
      ? preserveReadingDayOffset(
          current.readingDayOffset,
          now,
          current.readingTimezone,
          timeZone,
        )
      : 0;
    const nextRevision = sameTimeZone
      ? current.readingTimezoneRevision
      : current.readingTimezone
        ? current.readingTimezoneRevision + 1
        : 0;
    const timezonePredicate = raw?.readingTimezone
      ? eq(user.readingTimezone, raw.readingTimezone)
      : isNull(user.readingTimezone);
    const result = await db
      .update(user)
      .set({
        readingTimezone: timeZone,
        readingDayOffset: nextOffset,
        readingTimezoneRevision: nextRevision,
        updatedAt: now,
      })
      .where(
        and(
          eq(user.id, userId),
          timezonePredicate,
          eq(user.readingDayOffset, current.readingDayOffset),
          eq(user.readingTimezoneRevision, current.readingTimezoneRevision),
        ),
      );
    const changes = changedRows(result);
    if (changes === undefined || changes === 1) return timeZone;
  }
  throw new Error("Concurrent reading timezone update could not be applied");
}

export function buildReadingLogDeltaQueries(
  db: Database,
  input: {
    bookId: string;
    userId: string;
    delta: number;
    now: Date;
    timeZone: string;
    readingDayOffset: number;
    readingTimezoneRevision: number;
  },
  applied: SQL,
) {
  if (input.delta === 0) return [];
  const date = dateInTimeZone(input.now, input.timeZone);
  const readingDay = dateToDayNumber(date) + input.readingDayOffset;

  if (input.delta > 0) {
    const insert = db
      .insert(readingLogs)
      .select(
        sql`select ${crypto.randomUUID()}, ${input.bookId}, ${input.userId}, ${input.delta}, ${date}, ${readingDay}, ${input.readingTimezoneRevision}, ${input.now.toISOString()} where ${applied}`,
      )
      .onConflictDoUpdate({
        target: [
          readingLogs.bookId,
          readingLogs.readingTimezoneRevision,
          readingLogs.date,
        ],
        set: {
          pagesRead: sql`${readingLogs.pagesRead} + ${input.delta}`,
        },
      });
    return [insert];
  }

  // 制約上0ページの行を保持できないため、削除と残量減算を呼び出し元の
  // D1 batchへ含め、進捗更新とまとめて原子的に適用する。
  const correction = Math.abs(input.delta);
  const removeConsumedLog = db
    .delete(readingLogs)
    .where(
      and(
        eq(readingLogs.bookId, input.bookId),
        eq(readingLogs.userId, input.userId),
        eq(readingLogs.readingDay, readingDay),
        eq(readingLogs.readingTimezoneRevision, input.readingTimezoneRevision),
        eq(readingLogs.date, date),
        applied,
        sql`${readingLogs.pagesRead} <= ${correction}`,
      ),
    );

  const subtractCorrection = db
    .update(readingLogs)
    .set({ pagesRead: sql`${readingLogs.pagesRead} + ${input.delta}` })
    .where(
      and(
        eq(readingLogs.bookId, input.bookId),
        eq(readingLogs.userId, input.userId),
        eq(readingLogs.readingDay, readingDay),
        eq(readingLogs.readingTimezoneRevision, input.readingTimezoneRevision),
        eq(readingLogs.date, date),
        applied,
        sql`${readingLogs.pagesRead} > ${correction}`,
      ),
    );
  return [removeConsumedLog, subtractCorrection];
}
