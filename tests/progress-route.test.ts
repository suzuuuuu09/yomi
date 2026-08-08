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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let selectCall = 0;
const fakeDb = {
  select: () => ({
    from: () => ({
      where: () => {
        const rows = selectCall++ % 2 === 0 ? [row] : [];
        const result = Promise.resolve(rows);
        return Object.assign(result, {
          limit: async () => rows,
        });
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
                : row.currentPage + 1;
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
        };
        return Object.assign(Promise.resolve().then(apply), {
          returning: async () => {
            apply();
            return [row];
          },
        });
      },
    }),
  }),
};

vi.mock("@/server/lib/db", () => ({
  getDBFromContext: () => fakeDb,
}));

import app from "@/server";

describe("progress HTTP route", () => {
  beforeEach(() => {
    selectCall = 0;
    row.currentPage = 10;
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
      body: JSON.stringify({ page: 11 }),
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
  });

  it("accepts an atomic delta update", async () => {
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1 }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      book: { currentPage: 11 },
    });
  });

  it("rejects an absolute page beyond the book's total pages", async () => {
    row.totalPages = 100;

    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ page: 101 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(row.currentPage).toBe(10);
  });
});
