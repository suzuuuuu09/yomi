import { ApiClientError } from "@/lib/api-client";
import { type GuestSnapshot, GuestSnapshotSchema } from "@/lib/guest-schema";
import { pageToStatus, resolveCompletedAt } from "@/server/lib/book-status";
import {
  aggregateReadingDayNumbers,
  calculateReadingDayStreak,
  dateToDayNumber,
  dayNumberToDate,
  preserveReadingDayOffset,
  todayInTimeZone,
} from "@/server/lib/reading-log";
import {
  computeBrightness,
  computeColor,
  computeConstellationLines,
  computePosition,
} from "@/server/lib/star-formation";
import {
  CreateBookSchema,
  NoteCreateSchema,
  ProgressUpdateSchema,
  ReadingLogDateSchema,
  ReadingLogUpdateSchema,
  ReadingTimezoneSchema,
  UpdateBookSchema,
} from "@/server/schemas/books";

const STORAGE_KEY = "yomi:guest-library:v1";
export const MAX_BACKUP_BYTES = 4_000_000;

function guestError(message: string): never {
  throw new ApiClientError(message, {
    status: 400,
    code: "GUEST_STORAGE_ERROR",
  });
}

function emptySnapshot(): GuestSnapshot {
  return {
    version: 1,
    libraryId: crypto.randomUUID(),
    books: [],
    readingTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    readingDayOffset: 0,
    readingTimezoneRevision: 0,
  };
}

function readSnapshot(): GuestSnapshot {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === null
    ? emptySnapshot()
    : GuestSnapshotSchema.parse(JSON.parse(saved));
}

async function withSnapshot<T>(
  action: (snapshot: GuestSnapshot) => T,
  write = false,
  replacement?: GuestSnapshot,
): Promise<T> {
  if (!navigator.locks)
    guestError(
      "このブラウザーでは安全なゲスト保存を利用できません。ログインするか、対応ブラウザーを使用してください。",
    );
  try {
    return await navigator.locks.request(STORAGE_KEY, () => {
      const snapshot = replacement ?? readSnapshot();
      const result = action(snapshot);
      if (write || localStorage.getItem(STORAGE_KEY) === null) {
        const json = JSON.stringify(GuestSnapshotSchema.parse(snapshot));
        if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES)
          guestError(
            "ゲスト保存の容量上限です。バックアップを書き出し、不要な記録を整理してください。",
          );
        localStorage.setItem(STORAGE_KEY, json);
      }
      return result;
    });
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    guestError(
      "端末の記録を読み書きできませんでした。空き容量・保存の許可・バックアップを確認してください。",
    );
  }
}

export async function exportGuestBackup(): Promise<string> {
  return withSnapshot((snapshot) => JSON.stringify(snapshot));
}

export async function restoreGuestBackup(text: string): Promise<void> {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    guestError("バックアップが大きすぎます。");
  let restored: GuestSnapshot;
  try {
    restored = GuestSnapshotSchema.parse(JSON.parse(text));
  } catch {
    guestError(
      "対応するYOMiのバックアップではありません。現在の記録は変更していません。",
    );
  }
  await withSnapshot(() => undefined, true, restored);
}

export async function clearGuestLibrary(): Promise<void> {
  await withSnapshot(() => undefined, true, emptySnapshot());
}

export async function guestLibraryRequest(
  input: string,
  init?: RequestInit,
): Promise<unknown> {
  const url = new URL(input, "https://yomi.local");
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [, resource, id, operation, noteId] = parts;
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  return withSnapshot((snapshot) => {
    const today = todayInTimeZone(snapshot.readingTimezone);
    const readingDay = dateToDayNumber(today) + snapshot.readingDayOffset;
    const now = new Date().toISOString();
    if (resource === "books" && !id && method === "GET") {
      const books = snapshot.books.filter((book) => !book.archivedAt);
      return {
        books,
        constellationLines: computeConstellationLines(
          books.map((book) => ({
            ...book,
            positionX: book.position[0],
            positionY: book.position[1],
            positionZ: book.position[2],
          })),
        ),
      };
    }
    if (resource === "books" && id === "archived" && method === "GET")
      return { books: snapshot.books.filter((book) => book.archivedAt) };
    if (resource === "books" && !id && method === "POST") {
      const values = CreateBookSchema.parse(body);
      const brightness = computeBrightness(
        values.currentPage,
        values.totalPages,
      );
      const book = {
        ...values,
        id: crypto.randomUUID(),
        status: pageToStatus(values.currentPage, values.totalPages),
        registeredAt: now,
        completedAt: null,
        archivedAt: null,
        position: computePosition(
          values.genre,
          snapshot.books.map((book) => book.position),
        ),
        brightness,
        color: computeColor(values.genre, brightness),
        notes: [],
        logs: [],
      };
      snapshot.books.push(book);
      return { book };
    }
    if (resource === "reading-logs" && id === "settings") {
      if (method === "PUT") {
        const { readingTimezone } = ReadingTimezoneSchema.parse(body);
        const next =
          GuestSnapshotSchema.shape.readingTimezone.parse(readingTimezone);
        if (next !== snapshot.readingTimezone) {
          snapshot.readingDayOffset = preserveReadingDayOffset(
            snapshot.readingDayOffset,
            new Date(),
            snapshot.readingTimezone,
            next,
          );
          snapshot.readingTimezoneRevision += 1;
          snapshot.readingTimezone = next;
        }
      }
      return { readingTimezone: snapshot.readingTimezone };
    }
    if (resource === "reading-logs" && !id && method === "GET") {
      const logs = snapshot.books.flatMap((book) => book.logs);
      const days = Array.from(
        { length: 14 },
        (_, index) => readingDay - 13 + index,
      );
      return {
        days: aggregateReadingDayNumbers(
          logs,
          days,
          new Map(
            days.map((day) => [
              day,
              dayNumberToDate(day - snapshot.readingDayOffset),
            ]),
          ),
        ),
        streak: calculateReadingDayStreak(
          logs.map((log) => log.readingDay),
          readingDay,
        ),
        readingTimezone: snapshot.readingTimezone,
      };
    }
    const book = snapshot.books.find((book) => book.id === id);
    if (!book) guestError("本が見つかりません。");
    if (resource === "reading-logs") {
      if (method === "GET") return { logs: book.logs };
      const date = ReadingLogDateSchema.parse({ date: operation }).date;
      const values =
        method === "PUT"
          ? ReadingLogUpdateSchema.parse(body)
          : ReadingLogUpdateSchema.parse({
              pagesRead: 0,
              readingDay: url.searchParams.has("readingDay")
                ? Number(url.searchParams.get("readingDay"))
                : undefined,
              readingTimezoneRevision: url.searchParams.has(
                "readingTimezoneRevision",
              )
                ? Number(url.searchParams.get("readingTimezoneRevision"))
                : undefined,
            });
      const matches = book.logs.filter(
        (log) =>
          log.date === date &&
          (values.readingDay == null || log.readingDay === values.readingDay) &&
          (values.readingTimezoneRevision == null ||
            log.readingTimezoneRevision === values.readingTimezoneRevision),
      );
      if (matches.length > 1) guestError("対象の読書ログを選択してください。");
      const existing = matches[0];
      if (existing) {
        if (values.pagesRead === 0)
          book.logs = book.logs.filter((log) => log.id !== existing.id);
        else existing.pagesRead = values.pagesRead;
      } else if (values.pagesRead > 0) {
        if (values.readingDay != null || values.readingTimezoneRevision != null)
          guestError("対象の読書ログが見つかりません。");
        book.logs.push({
          id: crypto.randomUUID(),
          date,
          pagesRead: values.pagesRead,
          readingDay: dateToDayNumber(date) + snapshot.readingDayOffset,
          readingTimezoneRevision: snapshot.readingTimezoneRevision,
        });
      }
      return { ok: true };
    }
    if (operation === "archive" || (!operation && method === "DELETE")) {
      book.archivedAt = now;
      return { ok: true };
    }
    if (operation === "restore") {
      book.archivedAt = null;
      return { book };
    }
    if (operation === "permanent" && method === "DELETE") {
      snapshot.books = snapshot.books.filter((item) => item.id !== id);
      return { ok: true };
    }
    if (book.archivedAt)
      guestError("アーカイブ済みの本は復元してから編集してください。");
    if (operation === "notes") {
      if (method === "POST") {
        const note = {
          ...NoteCreateSchema.parse(body),
          page: body.page ?? null,
          id: crypto.randomUUID(),
          createdAt: now,
        };
        book.notes.push(note);
        return { id: note.id };
      }
      if (method === "DELETE") {
        book.notes = book.notes.filter((note) => note.id !== noteId);
        return { ok: true };
      }
    }
    const previousStatus = book.status;
    if (operation === "progress" && method === "POST") {
      const values = ProgressUpdateSchema.parse(body);
      const target = Math.min(
        1_000_000,
        Math.max(0, values.page ?? book.currentPage + (values.delta ?? 0)),
      );
      if (
        values.page !== undefined &&
        book.totalPages > 0 &&
        values.page > book.totalPages
      )
        guestError("進捗が総ページ数を超えています。");
      const next =
        book.totalPages > 0 ? Math.min(target, book.totalPages) : target;
      const delta = next - book.currentPage;
      const logs = book.logs
        .filter((log) => log.readingDay === readingDay)
        .sort(
          (a, b) =>
            b.readingTimezoneRevision - a.readingTimezoneRevision ||
            b.date.localeCompare(a.date) ||
            a.id.localeCompare(b.id),
        );
      if (delta > 0) {
        const existing = book.logs.find(
          (log) =>
            log.date === today &&
            log.readingTimezoneRevision === snapshot.readingTimezoneRevision,
        );
        if (existing) existing.pagesRead += delta;
        else
          book.logs.push({
            id: crypto.randomUUID(),
            date: today,
            readingDay,
            readingTimezoneRevision: snapshot.readingTimezoneRevision,
            pagesRead: delta,
          });
      } else {
        let remaining = -delta;
        for (const log of logs) {
          const amount = Math.min(remaining, log.pagesRead);
          log.pagesRead -= amount;
          remaining -= amount;
        }
        book.logs = book.logs.filter((log) => log.pagesRead > 0);
      }
      book.currentPage = next;
    } else if (!operation && method === "PUT") {
      const values = UpdateBookSchema.parse(body);
      if (values.totalPages && values.totalPages < book.currentPage)
        guestError("総ページ数は現在の進捗以上にしてください。");
      Object.assign(book, values);
    } else guestError("対応していない操作です。");
    book.status = pageToStatus(book.currentPage, book.totalPages);
    book.completedAt = resolveCompletedAt(
      book.status,
      previousStatus,
      now,
      book.completedAt,
    );
    book.brightness = computeBrightness(book.currentPage, book.totalPages);
    book.color = computeColor(book.genre, book.brightness);
    return { book };
  }, method !== "GET");
}
