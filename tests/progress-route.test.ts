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
let nextProgressDelta = 1;
let nextProgressUpdateChanges = 1;
const logs: Array<{
  id: string;
  bookId: string;
  userId: string;
  pagesRead: number;
  date: string;
  createdAt: string;
}> = [];
function fakeTransaction<T>(callback: (tx: typeof fakeDb) => Promise<T>) {
  return callback(fakeDb);
}

const fakeDb = {
  transaction: fakeTransaction,
  select: () => ({
    from: (table: unknown) => ({
      where: () => {
        const rows =
          table === books
            ? [structuredClone(row)]
            : table === readingNotes
              ? []
              : table === user
                ? [{ readingTimezone: timezone }]
                : table === readingLogs
                  ? structuredClone(logs)
                  : [];
        const result = Promise.resolve(rows);
        return Object.assign(result, { limit: async () => rows });
      },
    }),
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => {
        const apply = () => {
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
        };
        return Object.assign(
          Promise.resolve().then(() => {
            const changes =
              "currentPage" in values ? nextProgressUpdateChanges : 1;
            if ("currentPage" in values && changes === 0) {
              nextProgressUpdateChanges = 1;
            } else {
              apply();
            }
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
  }),
  delete: (table: unknown) => ({
    where: () => {
      if (table === readingLogs) logs.splice(0, logs.length);
      return Promise.resolve();
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
    nextProgressDelta = 1;
    nextProgressUpdateChanges = 1;
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
    nextProgressUpdateChanges = 0;
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
