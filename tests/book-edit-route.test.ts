import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { books, user } from "@/server/schemas/db";
import { createTestDatabase } from "./support/d1";

vi.mock("@/server/lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async () => ({
        user: { id: "user-1" },
        session: { id: "s" },
      }),
    },
  }),
}));
let database: ReturnType<typeof createTestDatabase>;
vi.mock("@/server/lib/db", () => ({ getDBFromContext: () => database.db }));

import app from "@/server";

beforeEach(async () => {
  database = createTestDatabase();
  await database.db
    .insert(user)
    .values({ id: "user-1", name: "利用者", email: "test@example.invalid" });
  await database.db.insert(books).values({
    id: "book-1",
    userId: "user-1",
    title: "本",
    totalPages: 100,
    currentPage: 90,
    status: "reading",
    registeredAt: "2026-01-01",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
});
afterEach(() => database.sqlite.close());

describe("book editing", () => {
  it("keeps a concurrent completion when only the title changes", async () => {
    database.hooks.beforeExecute = (query) => {
      if (!query.startsWith('update "books"')) return;
      database.hooks.beforeExecute = undefined;
      database.sqlite
        .prepare(
          "UPDATE books SET current_page = 100, status = 'completed', brightness = 0.9, completed_at = '2026-10-24' WHERE id = 'book-1'",
        )
        .run();
    };
    const response = await app.request("/api/books/book-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新しいタイトル" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      book: {
        title: "新しいタイトル",
        currentPage: 100,
        status: "completed",
        completedAt: "2026-10-24",
        brightness: 0.9,
      },
    });
  });
});
