import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/server/schemas/db";
import type { AppEnv } from "@/server/types";

export const getDb = (bindings: AppEnv["Bindings"]) => {
  const db = drizzle(bindings.yomi_db, { schema });
  return db;
};
