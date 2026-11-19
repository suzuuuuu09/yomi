import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "./support/d1";

let database: ReturnType<typeof createTestDatabase>;
vi.mock("@/server/lib/db", () => ({ getDBFromContext: () => database.db }));

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

describe("search HTTP route", () => {
  beforeEach(() => {
    database = createTestDatabase();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    database.sqlite.close();
    vi.unstubAllGlobals();
  });

  it("ゲストも認証なしで検索できる", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ totalItems: 0 })),
    );
    const response = await app.request("/api/search?q=TypeScript");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("検索上限に達すると外部APIを呼ばず、次の時間枠では再開できる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
    try {
      vi.mocked(fetch).mockImplementation(
        async () => new Response(JSON.stringify({ totalItems: 0 })),
      );
      for (let index = 0; index < 30; index += 1)
        expect((await app.request("/api/search?q=本")).status).toBe(200);
      const limited = await app.request("/api/search?q=本");
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBe("60");
      expect(fetch).toHaveBeenCalledTimes(30);
      vi.setSystemTime(new Date("2026-10-30T00:01:01Z"));
      expect((await app.request("/api/search?q=本")).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an empty or over-sized search request before the upstream call", async () => {
    const response = await app.request("/api/search?q=&index=-1&results=1000", {
      headers: { "x-test-user": "user-1" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_REQUEST",
        issues: expect.any(Array),
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a gateway error when Google Books is unavailable", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "quota exceeded" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await app.request("/api/search?q=TypeScript", {
      headers: { "x-test-user": "user-1" },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UPSTREAM_ERROR" },
    });
  });
});
