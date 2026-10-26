import { env as cloudflareEnv } from "cloudflare:workers";
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

export function createAuth(honoEnv: Env = {}, requestURL?: string) {
  const env: Env = { ...cloudflareEnv, ...honoEnv };

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
        "wrangler.jsonc の yomi_db と Cloudflare Vite plugin の設定を確認してください。",
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
