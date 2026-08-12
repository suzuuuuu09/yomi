import { and, eq, sql } from "drizzle-orm";
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

export interface ReadingSettings {
  readingTimezone: string | null;
  readingDayOffset: number;
  readingTimezoneRevision: number;
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
  const rows = await db
    .select({
      readingTimezone: user.readingTimezone,
      readingDayOffset: user.readingDayOffset,
      readingTimezoneRevision: user.readingTimezoneRevision,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const row = rows[0] as
    | {
        readingTimezone?: string | null;
        readingDayOffset?: number | null;
        readingTimezoneRevision?: number | null;
      }
    | undefined;
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

export async function ensureReadingSettings(
  db: Database,
  userId: string,
  candidate?: string,
): Promise<ReadingSettings & { readingTimezone: string }> {
  const saved = await getReadingSettings(db, userId);
  if (saved.readingTimezone)
    return saved as ReadingSettings & {
      readingTimezone: string;
    };

  if (!candidate || !isValidTimeZone(candidate)) {
    throw new MissingReadingTimezoneError();
  }
  const next = candidate;
  await db
    .update(user)
    .set({ readingTimezone: next, readingDayOffset: 0, updatedAt: new Date() })
    .where(eq(user.id, userId));
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
  const current = await getReadingSettings(db, userId);
  const currentOffset = current.readingDayOffset;
  const sameTimeZone = current.readingTimezone === timeZone;
  const nextOffset = current.readingTimezone
    ? preserveReadingDayOffset(
        currentOffset,
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
  await db
    .update(user)
    .set({
      readingTimezone: timeZone,
      readingDayOffset: nextOffset,
      readingTimezoneRevision: nextRevision,
      updatedAt: now,
    })
    .where(eq(user.id, userId));
  return timeZone;
}

export async function applyReadingLogDelta(
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
) {
  if (input.delta === 0) return;
  const date = dateInTimeZone(input.now, input.timeZone);
  const readingDay = dateToDayNumber(date) + input.readingDayOffset;

  if (input.delta > 0) {
    await db
      .insert(readingLogs)
      .values({
        id: crypto.randomUUID(),
        bookId: input.bookId,
        userId: input.userId,
        pagesRead: input.delta,
        date,
        readingDay,
        readingTimezoneRevision: input.readingTimezoneRevision,
        createdAt: input.now.toISOString(),
      })
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
    return;
  }

  // 呼び出し元の進捗トランザクション内で実行する。制約上0ページの行を
  // 保持できないため、削除と残量減算を同じトランザクションに含める。
  const correction = Math.abs(input.delta);
  await db
    .delete(readingLogs)
    .where(
      and(
        eq(readingLogs.bookId, input.bookId),
        eq(readingLogs.userId, input.userId),
        eq(readingLogs.readingDay, readingDay),
        eq(readingLogs.readingTimezoneRevision, input.readingTimezoneRevision),
        eq(readingLogs.date, date),
        sql`${readingLogs.pagesRead} <= ${correction}`,
      ),
    );

  await db
    .update(readingLogs)
    .set({ pagesRead: sql`${readingLogs.pagesRead} + ${input.delta}` })
    .where(
      and(
        eq(readingLogs.bookId, input.bookId),
        eq(readingLogs.userId, input.userId),
        eq(readingLogs.readingDay, readingDay),
        eq(readingLogs.readingTimezoneRevision, input.readingTimezoneRevision),
        eq(readingLogs.date, date),
        sql`${readingLogs.pagesRead} > ${correction}`,
      ),
    );
}
