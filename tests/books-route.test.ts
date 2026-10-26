import { describe, expect, it, vi } from "vitest";

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

vi.mock("cloudflare:workers", () => ({
  env: {},
}));

import app from "@/server";

describe("books HTTP route", () => {
  it("returns structured validation errors before touching the database", async () => {
    const response = await app.request("/api/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({
        title: " ",
        totalPages: "100",
        currentPage: 101,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_REQUEST",
        issues: expect.any(Array),
      },
    });
  });

  it("rejects malformed progress updates before a database lookup", async () => {
    const response = await app.request("/api/books/book-1/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ delta: 1, page: 3 }),
    });

    expect(response.status).toBe(400);
    expect(vi.isMockFunction(fetch)).toBe(false);
  });

  it("rejects an invalid reading timezone before a database lookup", async () => {
    const response = await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ readingTimezone: "Not/A/Timezone" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });

  it("rejects impossible dates when correcting a reading log", async () => {
    const response = await app.request("/api/reading-logs/book-1/2026-02-30", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": "user-1",
      },
      body: JSON.stringify({ pagesRead: 10 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });
});
