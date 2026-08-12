import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        if (headers.get("x-test-user") !== "user-1") return null;
        return {
          user: { id: "user-1" },
          session: { id: "session-1" },
        };
      },
    },
  }),
}));

vi.mock("@cloudflare/next-on-pages", () => ({
  getRequestContext: () => ({ env: {} }),
}));

const row = {
  id: "book-1",
  userId: "user-1",
  title: "テスト本",
  author: "著者",
  isbn: "",
  totalPages: 100,
  currentPage: 10,
  status: "reading" as const,
  genre: "技術",
  coverUrl: "",
  positionX: 1,
  positionY: 2,
  positionZ: 3,
  brightness: 0.5,
  color: "#ffffff",
  registeredAt: "2026-01-01T00:00:00.000Z",
  completedAt: null as string | null,
  archivedAt: null as string | null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let timezone: string | null = null;
let readingDayOffset = 0;
let timezoneRevision = 0;
let nextProgressDelta = 1;
let progressUpdateChanges: number[] = [1];
let lastProgressUpdateApplied = false;
let simulateSettingsRace = false;
let failNextBatch = false;
let onProgressConflict: (() => void) | undefined;
const logs: Array<{
  id: string;
  bookId: string;
  userId: string;
  pagesRead: number;
  date: string;
  readingDay: number;
  readingTimezoneRevision: number;
  createdAt: string;
}> = [];

function primitiveSqlValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(primitiveSqlValues);
  if (typeof value === "string" || typeof value === "number") return [value];
  if (typeof value !== "object" || value === null) return [];
  const parameter = (value as { value?: unknown }).value;
  if (typeof parameter === "string" || typeof parameter === "number") {
    return [parameter];
  }
  const chunks = (value as { queryChunks?: unknown[] }).queryChunks;
  return Array.isArray(chunks) ? chunks.flatMap(primitiveSqlValues) : [];
}

const fakeDb = {
  transaction: () => {
    throw new Error("D1 does not support SQL BEGIN");
  },
  batch: async (queries: Promise<unknown>[]) => {
    const snapshot = {
      row: structuredClone(row),
      timezone,
      readingDayOffset,
      timezoneRevision,
      logs: structuredClone(logs),
    };
    const results = await Promise.all(queries);
    if (failNextBatch) {
      failNextBatch = false;
      Object.assign(row, snapshot.row);
      timezone = snapshot.timezone;
      readingDayOffset = snapshot.readingDayOffset;
      timezoneRevision = snapshot.timezoneRevision;
      logs.splice(0, logs.length, ...snapshot.logs);
      throw new Error("simulated batch failure");
    }
    return results;
  },
  select: () => ({
    from: (table: unknown) => ({
      where: () => {
        const rows =
          table === books
            ? [structuredClone(row)]
            : table === readingNotes
              ? []
              : table === user
                ? [
                    {
                      readingTimezone: timezone,
                      readingDayOffset,
                      readingTimezoneRevision: timezoneRevision,
                    },
                  ]
                : table === readingLogs
                  ? structuredClone(logs)
                  : [];
        if (table === user && simulateSettingsRace) {
          simulateSettingsRace = false;
          queueMicrotask(() => {
            timezone = "Asia/Tokyo";
            readingDayOffset = 0;
            timezoneRevision = 1;
          });
        }
        const result = Promise.resolve(rows);
        return Object.assign(result, { limit: async () => rows });
      },
    }),
  }),
  update: (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: (predicate: unknown) => {
        const apply = () => {
          if (table === readingLogs && "pagesRead" in values) {
            const predicateValues = primitiveSqlValues(predicate);
            const target = logs.find((log) => predicateValues.includes(log.id));
            const amounts = primitiveSqlValues(values.pagesRead);
            const amount = amounts.find((value) => typeof value === "number");
            if (target && typeof amount === "number") {
              target.pagesRead -= amount;
            }
            return;
          }
          if ("currentPage" in values) {
            row.currentPage =
              typeof values.currentPage === "number"
                ? values.currentPage
                : row.currentPage + nextProgressDelta;
          }
          if (typeof values.status === "string")
            row.status = values.status as typeof row.status;
          if (
            typeof values.completedAt === "string" ||
            values.completedAt === null
          ) {
            row.completedAt = values.completedAt as string | null;
          }
          if (typeof values.brightness === "number")
            row.brightness = values.brightness;
          if (typeof values.color === "string") row.color = values.color;
          if (typeof values.readingTimezone === "string") {
            timezone = values.readingTimezone;
          }
          if (typeof values.readingDayOffset === "number") {
            readingDayOffset = values.readingDayOffset;
          }
          if (typeof values.readingTimezoneRevision === "number") {
            timezoneRevision = values.readingTimezoneRevision;
          }
        };
        return Object.assign(
          Promise.resolve().then(() => {
            const changes =
              "currentPage" in values
                ? (progressUpdateChanges.shift() ?? 1)
                : 1;
            if (table === books && "currentPage" in values) {
              lastProgressUpdateApplied = changes === 1;
              if (changes === 0) onProgressConflict?.();
            }
            if (!("currentPage" in values && changes === 0)) apply();
            return { meta: { changes } };
          }),
          {
            returning: async () => {
              apply();
              return [row];
            },
          },
        );
      },
    }),
  }),
  insert: (table: unknown) => ({
    values: (values: (typeof logs)[number]) => {
      const apply = () => {
        if (table !== readingLogs) return;
        const existing = logs.find(
          (log) => log.bookId === values.bookId && log.date === values.date,
        );
        if (existing) existing.pagesRead += values.pagesRead;
        else logs.push(structuredClone(values));
      };
      return {
        onConflictDoUpdate: () => Promise.resolve().then(apply),
      };
    },
    select: (selection: unknown) => ({
      onConflictDoUpdate: () =>
        Promise.resolve().then(() => {
          if (table !== readingLogs || !lastProgressUpdateApplied) return;
          const values = primitiveSqlValues(selection);
          const pagesRead =
            typeof values[0] === "number" ? values[0] : nextProgressDelta;
          const readingDay = typeof values[1] === "number" ? values[1] : 0;
          const readingTimezoneRevision =
            typeof values[2] === "number" ? values[2] : timezoneRevision;
          const existing = logs.find(
            (log) =>
              log.bookId === row.id &&
              log.readingTimezoneRevision === readingTimezoneRevision,
          );
          if (existing) existing.pagesRead += pagesRead;
          else {
            logs.push({
              id: `log-${readingTimezoneRevision}`,
              bookId: row.id,
              userId: row.userId,
              pagesRead,
              date: "2026-08-12",
              readingDay,
              readingTimezoneRevision,
              createdAt: "2026-08-12T00:00:00.000Z",
            });
          }
        }),
    }),
  }),
  delete: (table: unknown) => ({
    where: (predicate: unknown) => {
      return Promise.resolve().then(() => {
        if (table === readingLogs && lastProgressUpdateApplied) {
          const values = primitiveSqlValues(predicate);
          const target = logs.find((log) => values.includes(log.id));
          if (target) {
            logs.splice(logs.indexOf(target), 1);
          }
        }
      });
    },
  }),
};

vi.mock("@/server/lib/db", () => ({
  getDBFromContext: () => fakeDb,
}));

import app from "@/server";
import { books, readingLogs, readingNotes, user } from "@/server/schemas/db";

describe("progress HTTP route", () => {
  beforeEach(() => {
    timezone = null;
    readingDayOffset = 0;
    timezoneRevision = 0;
    nextProgressDelta = 1;
    progressUpdateChanges = [1];
    lastProgressUpdateApplied = false;
    simulateSettingsRace = false;
    failNextBatch = false;
    onProgressConflict = undefined;
    logs.splice(0, logs.length);
    row.currentPage = 10;
    row.totalPages = 100;
    row.status = "reading";
    row.completedAt = null;
  });

  it("returns the canonical book after a page update", async () => {
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ page: 11, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      book: {
        id: "book-1",
        currentPage: 11,
        status: "reading",
      },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.pagesRead).toBe(1);
    expect(timezone).toBe("Asia/Tokyo");
  });

  it("accepts an atomic delta update", async () => {
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      book: { currentPage: 11 },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.pagesRead).toBe(1);
  });

  it("retries a progress update when the compare-and-set loses a race", async () => {
    progressUpdateChanges = [0, 1];
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(200);
    expect(row.currentPage).toBe(11);
    expect(logs[0]?.pagesRead).toBe(1);
  });

  it("subtracts a correction from the same day's log and removes it at zero", async () => {
    const add = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });
    expect(add.status).toBe(200);
    expect(logs).toHaveLength(1);

    nextProgressDelta = -1;
    const correction = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: -1, readingTimezone: "Asia/Tokyo" }),
    });
    expect(correction.status).toBe(200);
    expect(logs).toHaveLength(0);
  });

  it("rejects an absolute page beyond the book's total pages", async () => {
    row.totalPages = 100;

    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ page: 101, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(row.currentPage).toBe(10);
  });

  it("revalidates the page limit after a CAS retry", async () => {
    progressUpdateChanges = [0];
    onProgressConflict = () => {
      Object.assign(row, { currentPage: 50, totalPages: 60 });
    };

    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ page: 90, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(400);
    expect(row.currentPage).toBe(50);
    expect(logs).toHaveLength(0);
  });

  it("keeps the first timezone save atomic with progress", async () => {
    failNextBatch = true;
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(500);
    expect(timezone).toBeNull();
    expect(row.currentPage).toBe(10);
    expect(logs).toHaveLength(0);
  });

  it("retries with the timezone generation that won a concurrent update", async () => {
    timezone = "UTC";
    timezoneRevision = 0;
    progressUpdateChanges = [0, 1];
    simulateSettingsRace = true;

    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });

    expect(response.status).toBe(200);
    expect(timezoneRevision).toBe(1);
    expect(logs[0]?.readingTimezoneRevision).toBe(1);
  });

  it("corrects a log from an older timezone generation on the same reading day", async () => {
    const add = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });
    expect(add.status).toBe(200);
    expect(logs).toHaveLength(1);

    timezoneRevision = 1;
    nextProgressDelta = -1;
    const correction = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: -1 }),
    });

    expect(correction.status).toBe(200);
    expect(logs).toHaveLength(0);
  });

  it("distributes a correction across multiple timezone generations", async () => {
    const first = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });
    expect(first.status).toBe(200);

    timezoneRevision = 1;
    const second = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1 }),
    });
    expect(second.status).toBe(200);
    expect(logs).toHaveLength(2);

    const correction = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: -2 }),
    });

    expect(correction.status).toBe(200);
    expect(logs).toHaveLength(0);
  });

  it("does not subtract below zero while partially consuming generations", async () => {
    const first = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 5, readingTimezone: "Asia/Tokyo" }),
    });
    expect(first.status).toBe(200);

    timezoneRevision = 1;
    const second = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 3 }),
    });
    expect(second.status).toBe(200);
    expect(logs).toHaveLength(2);
    logs[0].pagesRead = 5;
    logs[1].pagesRead = 3;

    const correction = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: -6 }),
    });

    expect(correction.status).toBe(200);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      readingTimezoneRevision: 0,
      pagesRead: 2,
    });
  });

  it("requires a timezone for the first direct progress update", async () => {
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1 }),
    });

    expect(response.status).toBe(400);
    expect(row.currentPage).toBe(10);
    expect(logs).toHaveLength(0);
  });
});
