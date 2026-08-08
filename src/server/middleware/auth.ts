import { createMiddleware } from "hono/factory";
import { apiError } from "@/server/lib/api-error";
import { type AuthInstance, createAuth } from "@/server/lib/auth";
import type { AppEnv } from "@/server/types";

/**
 * セッションからユーザーを取得し、userとsessionにセットする
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  let session: Awaited<ReturnType<AuthInstance["api"]["getSession"]>> = null;

  try {
    const auth = createAuth(c.env, c.req.url);
    session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
  } catch (error) {
    console.error("Authentication service failed", error);
    return apiError(c, 500, "INTERNAL_ERROR", "認証を確認できませんでした");
  }

  if (!session) {
    return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});
