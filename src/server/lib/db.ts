import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/server/schemas/db";
export function getDBFromContext() {
  const env = getRequestContext().env as { yomi_db?: D1Database };
  if (!env.yomi_db) {
    throw new Error("D1のデータベースが見つかりません");
  }
  return drizzle(env.yomi_db, { schema });
}
