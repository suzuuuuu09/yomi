import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session, user } from "@/server/schemas/db";
import { createTestDatabase } from "./support/d1";

const secret = "workers-migration-test-secret-at-least-32-characters";
const token = "workers-migration-test-session";
let database: ReturnType<typeof createTestDatabase>;

vi.mock("cloudflare:workers", () => ({
  env: {
    get yomi_db() {
      return database.binding;
    },
    BETTER_AUTH_SECRET: "workers-migration-test-secret-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost",
    GOOGLE_CLIENT_ID: "test-client",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
  },
}));

import app from "@/server";

beforeEach(async () => {
  database = createTestDatabase();
  await database.db.insert(user).values({
    id: "worker-user",
    name: "利用者",
    email: "worker@example.invalid",
  });
  await database.db.insert(session).values({
    id: "worker-session",
    userId: "worker-user",
    token,
    expiresAt: new Date(Date.now() + 60_000),
  });
});

afterEach(() => database.sqlite.close());

describe("Workers bindings with real session validation", () => {
  it("rejects a session token with an invalid signature", async () => {
    const response = await app.request("/api/books", {
      headers: { cookie: `better-auth.session_token=${token}.invalid` },
    });

    expect(response.status).toBe(401);
  });

  it("authenticates and saves a book using the D1 binding", async () => {
    const signature = createHmac("sha256", secret)
      .update(token)
      .digest("base64");
    const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
    const created = await app.request("/api/books", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Workersで読む本", totalPages: 100 }),
    });

    expect(created.status).toBe(201);

    const listed = await app.request("/api/books", { headers: { cookie } });
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      books: [{ title: "Workersで読む本", currentPage: 0 }],
    });
  });
});
