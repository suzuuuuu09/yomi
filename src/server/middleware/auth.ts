import { createMiddleware } from "hono/factory";
import { createAuth } from "@/server/lib/auth";
import type { AppEnv } from "@/server/types";

/**
 * セッションからユーザーを取得し、userとsessionにセットする
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env, c.req.url);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
