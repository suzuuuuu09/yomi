import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getRequestContext } from "@cloudflare/next-on-pages";
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

function getCFEnv(): Env {
  try {
    return getRequestContext().env as Env;
  } catch {
    return {};
  }
}

export function createAuth(honoEnv: Env = {}, requestURL?: string) {
  // NOTE: CF env: getRequestContext() (本番・ローカルwrangler) → honoEnv → fallback
  const cfEnv = getCFEnv();
  const env: Env = { ...cfEnv, ...honoEnv };

  const googleClientId =
    env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret =
    env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "";

  // BETTER_AUTH_URL 未設定時はリクエストのオリジンを使う
  const baseURL =
    env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    (requestURL ? new URL(requestURL).origin : "http://localhost:3000");

  if (!env.yomi_db) {
    throw new Error(
      "D1 database binding (yomi_db) not found. " +
        "Local dev: setupDevPlatform() が instrumentation.ts で設定されているか確認してください。",
    );
  }

  const database = drizzleAdapter(drizzleD1(env.yomi_db, { schema }), {
    provider: "sqlite",
  });

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
