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

import app from "@/server";

describe("search HTTP route", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requires an authenticated session", async () => {
    const response = await app.request("/api/search?q=TypeScript");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
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
