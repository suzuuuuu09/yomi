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

it.each([
  ["DELETE", "/api/books/book-1"],
  ["POST", "/api/books/book-1/archive"],
])("keeps the %s archive endpoint compatible", async (method, path) => {
  const archived = await app.request(path, { method });
  expect(archived.status).toBe(200);
  await expect(archived.json()).resolves.toEqual({ ok: true });
  const active = await app.request("/api/books");
  await expect(active.json()).resolves.toMatchObject({
    books: [],
    constellationLines: [],
  });
  const restore = await app.request("/api/books/book-1/restore", {
    method: "POST",
  });
  expect(restore.status).toBe(200);
  await expect(restore.json()).resolves.toMatchObject({
    book: { id: "book-1", archivedAt: null },
  });
});

it("preserves the book creation response and its legacy fields", async () => {
  const response = await app.request("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "新しい本" }),
  });
  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    id: string;
    position: number[];
    brightness: number;
    color: string;
    book: { id: string; position: number[]; brightness: number; color: string };
  };
  expect(body.id).toBe(body.book.id);
  expect(body.position).toEqual(body.book.position);
  expect(body.brightness).toBe(body.book.brightness);
  expect(body.color).toBe(body.book.color);
});
