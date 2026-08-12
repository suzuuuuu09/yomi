import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readingLogs, user } from "@/server/schemas/db";

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

let timezone = "Asia/Tokyo";
let readingDayOffset = 0;
let logs: Array<{
  date: string;
  pagesRead: number;
  readingDay: number | null;
}> = [];

const fakeDb = {
  transaction: () => {
    throw new Error("D1 does not support SQL BEGIN");
  },
  select: () => ({
    from: (table: unknown) => {
      const rows =
        table === user
          ? [{ readingTimezone: timezone, readingDayOffset }]
          : table === readingLogs
            ? structuredClone(logs)
            : [];
      const result = Promise.resolve(rows);
      return Object.assign(result, {
        where: () => result,
        limit: async () => rows,
        orderBy: () => result,
      });
    },
  }),
  update: (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: () => {
        if (table === user) {
          if (typeof values.readingTimezone === "string") {
            timezone = values.readingTimezone;
          }
          if (typeof values.readingDayOffset === "number") {
            readingDayOffset = values.readingDayOffset;
          }
        }
        return Promise.resolve({ meta: { changes: 1 } });
      },
    }),
  }),
};

vi.mock("@/server/lib/db", () => ({
  getDBFromContext: () => fakeDb,
}));

import app from "@/server";
import { dateToDayNumber } from "@/server/lib/reading-log";

describe("reading log stats route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T00:30:00.000Z"));
    timezone = "Asia/Tokyo";
    readingDayOffset = 0;
    logs = [
      {
        date: "2026-08-12",
        pagesRead: 1,
        readingDay: dateToDayNumber("2026-08-12"),
      },
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps stats stable when a timezone change crosses a date boundary", async () => {
    const headers = { "x-test-user": "user-1" };
    const before = await app.request("/api/reading-logs", { headers });
    expect(before.status).toBe(200);
    await expect(before.json()).resolves.toMatchObject({ streak: 1 });

    const update = await app.request("/api/reading-logs/settings", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ readingTimezone: "America/Los_Angeles" }),
    });
    expect(update.status).toBe(200);
    expect(readingDayOffset).toBe(1);

    const after = await app.request("/api/reading-logs", { headers });
    expect(after.status).toBe(200);
    await expect(after.json()).resolves.toMatchObject({ streak: 1 });
  });
});
