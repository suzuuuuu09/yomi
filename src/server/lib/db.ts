import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/server/schemas/db";
export function getDBFromContext() {
  if (!env.yomi_db) {
    throw new Error("D1のデータベースが見つかりません");
  }
  return drizzle(env.yomi_db, { schema });
}
