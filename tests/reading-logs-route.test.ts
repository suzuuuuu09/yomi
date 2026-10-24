import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { books, user } from "@/server/schemas/db";
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
    registeredAt: "2026-01-01",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
});
afterEach(() => {
  database.sqlite.close();
  vi.useRealTimers();
});

describe("reading log stats route", () => {
  it("keeps stats stable when a timezone change crosses a date boundary", async () => {
    const progress = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers,
      body: JSON.stringify({ delta: 1, readingTimezone: "Asia/Tokyo" }),
    });
    expect(progress.status).toBe(200);
    const before = await app.request("/api/reading-logs", { headers });
    await expect(before.json()).resolves.toMatchObject({ streak: 1 });

    const update = await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ readingTimezone: "America/Los_Angeles" }),
    });
    expect(update.status).toBe(200);
    const after = await app.request("/api/reading-logs", { headers });
    await expect(after.json()).resolves.toMatchObject({
      streak: 1,
      readingTimezone: "America/Los_Angeles",
      days: expect.arrayContaining([
        { date: "2026-08-11", pagesRead: 1, readingDay: 20677 },
      ]),
    });
  });
});
