import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "@/server/schemas/db";

export type AuthInstance = ReturnType<typeof createAuth>;

type Env = {
  yomi_db?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  FRONTEND_URL?: string;
};

let localDrizzle:
  | ReturnType<typeof import("drizzle-orm/better-sqlite3").drizzle>
  | undefined;

function getLocalDrizzle() {
  if (!localDrizzle) {
    const Database = require("better-sqlite3");
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    const sqlite = new Database(".dev.db");
    localDrizzle = drizzle(sqlite, { schema });
  }
  return localDrizzle!;
}

export function createAuth(env: Env = {}, requestURL?: string) {
  const googleClientId =
    env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret =
    env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "";

  // BETTER_AUTH_URL 未設定時はリクエストのオリジンを使う（本番環境対応）
  const baseURL =
    env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    (requestURL ? new URL(requestURL).origin : "http://localhost:3000");

  const database = env.yomi_db
    ? drizzleAdapter(drizzleD1(env.yomi_db, { schema }), { provider: "sqlite" })
    : drizzleAdapter(getLocalDrizzle(), { provider: "sqlite" });

  return betterAuth({
    database,
    baseURL,
    secret,
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30日
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5分
      },
    },
  });
}
