import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { books, user } from "@/server/schemas/db";
import type { Book, ReadingLog } from "@/types/library";
import { createTestDatabase } from "./support/d1";

vi.mock("@/server/lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) =>
        headers.get("x-test-user") === "user-1"
          ? { user: { id: "user-1" }, session: { id: "s" } }
          : null,
    },
  }),
}));
let database: ReturnType<typeof createTestDatabase>;
vi.mock("@/server/lib/db", () => ({ getDBFromContext: () => database.db }));

import app from "@/server";

const headers = { "x-test-user": "user-1", "Content-Type": "application/json" };
const progress = (input: object) =>
  app.request("/api/books/book-1/progress", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
const logs = async () =>
  (
    (await (
      await app.request("/api/reading-logs/book-1", { headers })
    ).json()) as { logs: ReadingLog[] }
  ).logs;
const book = async () =>
  (
    (await (await app.request("/api/books", { headers })).json()) as {
      books: Book[];
    }
  ).books[0];

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-12T00:30:00Z"));
  database = createTestDatabase();
  await database.db
    .insert(user)
    .values({ id: "user-1", name: "利用者", email: "test@example.invalid" });
  await database.db.insert(books).values({
    id: "book-1",
    userId: "user-1",
    title: "本",
    totalPages: 100,
    currentPage: 10,
    status: "reading",
    registeredAt: "2026-01-01",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
});
afterEach(() => {
  database.sqlite.close();
  vi.useRealTimers();
});

describe("progress HTTP route with SQLite", () => {
  it("returns the saved book and records only the page difference", async () => {
    const response = await progress({
      page: 11,
      readingTimezone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      book: { currentPage: 11, status: "reading" },
    });
    expect(await logs()).toMatchObject([{ pagesRead: 1 }]);
    const settings = await app.request("/api/reading-logs/settings", {
      headers,
    });
    await expect(settings.json()).resolves.toEqual({
      readingTimezone: "Asia/Tokyo",
    });
  });

  it("keeps both concurrent increments and their reading logs", async () => {
    const responses = await Promise.all([
      progress({ delta: 1, readingTimezone: "Asia/Tokyo" }),
      progress({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await book()).toMatchObject({ currentPage: 12 });
    expect(await logs()).toMatchObject([{ pagesRead: 2 }]);
  });

  it("removes a daily log when progress is corrected back to zero", async () => {
    await progress({ delta: 1, readingTimezone: "Asia/Tokyo" });
    expect((await progress({ delta: -1 })).status).toBe(200);
    expect(await logs()).toEqual([]);
  });

  it("rejects an absolute page outside the book", async () => {
    expect(
      (await progress({ page: 101, readingTimezone: "Asia/Tokyo" })).status,
    ).toBe(400);
    expect(await book()).toMatchObject({ currentPage: 10 });
  });

  it("checks the page limit again after a concurrent edit", async () => {
    database.hooks.beforeExecute = (query) => {
      if (!query.startsWith('update "books"')) return;
      database.hooks.beforeExecute = undefined;
      database.sqlite
        .prepare(
          "UPDATE books SET current_page = 50, total_pages = 60 WHERE id = 'book-1'",
        )
        .run();
    };
    expect(
      (await progress({ page: 90, readingTimezone: "Asia/Tokyo" })).status,
    ).toBe(400);
    expect(await book()).toMatchObject({ currentPage: 50 });
    expect(await logs()).toEqual([]);
  });

  it("rolls back timezone and progress when the log write fails", async () => {
    database.hooks.beforeExecute = (query) => {
      if (query.startsWith('insert into "reading_logs"'))
        throw new Error("書き込み失敗");
    };
    expect(
      (await progress({ delta: 1, readingTimezone: "Asia/Tokyo" })).status,
    ).toBe(500);
    expect(await book()).toMatchObject({ currentPage: 10 });
    const settings = await app.request("/api/reading-logs/settings", {
      headers,
    });
    await expect(settings.json()).resolves.toEqual({ readingTimezone: null });
    expect(await logs()).toEqual([]);
  });

  it("records progress using a timezone generation changed during the update", async () => {
    await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ readingTimezone: "UTC" }),
    });
    database.hooks.beforeExecute = (query) => {
      if (!query.startsWith('update "books"')) return;
      database.hooks.beforeExecute = undefined;
      database.sqlite
        .prepare(
          "UPDATE users SET reading_timezone = 'Asia/Tokyo', reading_timezone_revision = 1",
        )
        .run();
    };
    expect((await progress({ delta: 1 })).status).toBe(200);
    expect(await logs()).toMatchObject([
      { pagesRead: 1, readingTimezoneRevision: 1 },
    ]);
  });

  it("corrects the same logical day across multiple timezone generations", async () => {
    await progress({ delta: 5, readingTimezone: "Asia/Tokyo" });
    await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ readingTimezone: "America/Los_Angeles" }),
    });
    await progress({ delta: 3 });
    expect(await logs()).toHaveLength(2);
    await progress({ delta: -6 });
    expect(await logs()).toMatchObject([
      { pagesRead: 2, readingTimezoneRevision: 0 },
    ]);
    await progress({ delta: -2 });
    expect(await logs()).toEqual([]);
  });

  it("requires a timezone for the first direct progress update", async () => {
    expect((await progress({ delta: 1 })).status).toBe(400);
    expect(await book()).toMatchObject({ currentPage: 10 });
    expect(await logs()).toEqual([]);
  });
});
