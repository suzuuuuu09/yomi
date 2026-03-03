import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "@/server/lib/auth";
import type { AppEnv } from "@/server/types";

const authApp = new OpenAPIHono<AppEnv>();

authApp.on(["POST", "GET"], "/*", async (c) => {
  const auth = createAuth(c.env, c.req.url);
  return auth.handler(c.req.raw);
});

export default authApp;
