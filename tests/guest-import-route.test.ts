import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { books, user } from "@/server/schemas/db";
import { createTestDatabase } from "./support/d1";

vi.mock("@/server/lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("x-test-user");
        return id ? { user: { id }, session: { id: "s" } } : null;
      },
    },
  }),
}));
let database: ReturnType<typeof createTestDatabase>;
vi.mock("@/server/lib/db", () => ({ getDBFromContext: () => database.db }));

import app from "@/server";

const bookId = "00000000-0000-4000-8000-000000000001";
const input = {
  libraryId: "00000000-0000-4000-8000-000000000002",
  readingTimezone: "Asia/Tokyo",
  readingDayOffset: 0,
  readingTimezoneRevision: 0,
  book: {
    id: bookId,
    title: "引き継ぐ本",
    author: "著者",
    isbn: "same-isbn",
    totalPages: 100,
    currentPage: 20,
    status: "reading",
    genre: "技術",
    coverUrl: "",
    registeredAt: "2026-10-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    position: [1, 2, 3],
    brightness: 0.3,
    color: "#ffffff",
    notes: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        content: "引き継ぐメモ",
        page: 10,
        createdAt: "2026-10-02T00:00:00.000Z",
      },
    ],
    logs: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        date: "2026-10-02",
        pagesRead: 20,
        readingDay: 20728,
        readingTimezoneRevision: 0,
      },
    ],
  },
};

beforeEach(async () => {
  database = createTestDatabase();
  await database.db.insert(user).values([
    { id: "user-1", name: "利用者", email: "one@example.invalid" },
    { id: "user-2", name: "別の利用者", email: "two@example.invalid" },
  ]);
  await database.db.insert(books).values({
    id: "existing",
    userId: "user-1",
    title: "既存の本",
    isbn: "same-isbn",
    currentPage: 90,
    totalPages: 100,
    registeredAt: "2026-01-01",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
});
afterEach(() => database.sqlite.close());

function request(userId: string | null, payload = input) {
  return app.request("/api/guest-import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-test-user": userId } : {}),
    },
    body: JSON.stringify({ ...payload, expectedUserId: userId }),
  });
}

it("引き継ぎは認証が必要", async () => {
  expect((await request(null)).status).toBe(401);
});

it("同じISBNの記録を上書きせず、メモ・ログを保持し、再試行しても増えない", async () => {
  expect((await request("user-1")).status).toBe(200);
  expect((await request("user-1")).status).toBe(200);
  const list = await app.request("/api/books", {
    headers: { "x-test-user": "user-1" },
  });
  const payload = (await list.json()) as {
    books: {
      id: string;
      title: string;
      currentPage: number;
      notes: unknown[];
    }[];
  };
  expect(payload.books).toHaveLength(2);
  expect(
    payload.books.find((book) => book.id === "existing")?.currentPage,
  ).toBe(90);
  const imported = payload.books.find((book) => book.id !== "existing");
  expect(imported).toMatchObject({
    title: "引き継ぐ本",
    currentPage: 20,
    notes: [{ content: "引き継ぐメモ" }],
  });
  const logs = await app.request(`/api/reading-logs/${imported?.id}`, {
    headers: { "x-test-user": "user-1" },
  });
  expect(await logs.json()).toMatchObject({
    logs: [{ date: "2026-10-02", pagesRead: 20 }],
  });
  const correction = await app.request(
    `/api/reading-logs/${imported?.id}/2026-10-02`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user": "user-1" },
      body: JSON.stringify({ pagesRead: 18, readingTimezoneRevision: -1 }),
    },
  );
  expect(correction.status).toBe(200);
  expect(await correction.json()).toMatchObject({
    log: { pagesRead: 18, readingTimezoneRevision: -1 },
  });
  expect((await request("user-2")).status).toBe(200);
});

it("途中で保存が失敗しても本・メモ・ログを部分的に残さず再試行できる", async () => {
  database.hooks.beforeExecute = (query) => {
    if (query.startsWith("INSERT INTO reading_logs"))
      throw new Error("storage failure");
  };
  expect((await request("user-1")).status).toBe(500);
  database.hooks.beforeExecute = undefined;
  const list = await app.request("/api/books", {
    headers: { "x-test-user": "user-1" },
  });
  expect(await list.json()).toMatchObject({ books: [{ id: "existing" }] });
  expect((await request("user-1")).status).toBe(200);
});

it("不正な記録を拒否し、引き継いだ本を完全削除した後も再試行で復活させない", async () => {
  expect(
    (
      await request("user-1", {
        ...input,
        book: { ...input.book, currentPage: 101 },
      })
    ).status,
  ).toBe(400);
  await request("user-1");
  const list = await app.request("/api/books", {
    headers: { "x-test-user": "user-1" },
  });
  const payload = (await list.json()) as { books: { id: string }[] };
  const imported = payload.books.find((book) => book.id !== "existing");
  await app.request(`/api/books/${imported?.id}/permanent`, {
    method: "DELETE",
    headers: { "x-test-user": "user-1" },
  });
  await request("user-1");
  const after = await app.request("/api/books", {
    headers: { "x-test-user": "user-1" },
  });
  expect(await after.json()).toMatchObject({ books: [{ id: "existing" }] });
});

it("異なるタイムゾーンから引き継いだログと、引き継ぎ後の今日の進捗を混ぜない", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T00:30:00Z"));
  try {
    await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user": "user-1" },
      body: JSON.stringify({ readingTimezone: "America/Los_Angeles" }),
    });
    const payload = {
      ...input,
      book: {
        ...input.book,
        logs: [
          { ...input.book.logs[0], date: "2026-10-29", readingDay: 20755 },
        ],
      },
    };
    expect((await request("user-1", payload)).status).toBe(200);
    const list = await app.request("/api/books", {
      headers: { "x-test-user": "user-1" },
    });
    const data = (await list.json()) as { books: { id: string }[] };
    const imported = data.books.find((book) => book.id !== "existing");
    expect(
      (
        await app.request(`/api/books/${imported?.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-user": "user-1",
          },
          body: JSON.stringify({ delta: 5 }),
        })
      ).status,
    ).toBe(200);
    const stats = await app.request("/api/reading-logs", {
      headers: { "x-test-user": "user-1" },
    });
    expect(await stats.json()).toMatchObject({
      days: expect.arrayContaining([
        { date: "2026-10-29", pagesRead: 5, readingDay: 20755 },
      ]),
    });
  } finally {
    vi.useRealTimers();
  }
});
