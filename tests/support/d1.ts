import { readdirSync, readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/server/schemas/db";

export function createTestDatabase() {
  const sqlite = new Database(":memory:");
  for (const file of readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }

  const hooks: { beforeExecute?: (query: string) => void } = {};
  function prepare(query: string, parameters: unknown[] = []) {
    const execute = () => {
      hooks.beforeExecute?.(query);
      const statement = sqlite.prepare(query);
      if (statement.reader) {
        return {
          results: statement.all(...parameters),
          success: true,
          meta: { changes: 0 },
        };
      }
      const result = statement.run(...parameters);
      return { results: [], success: true, meta: { changes: result.changes } };
    };

    return {
      bind: (...values: unknown[]) => prepare(query, values),
      all: async () => execute(),
      run: async () => execute(),
      raw: async () => {
        hooks.beforeExecute?.(query);
        return sqlite
          .prepare(query)
          .raw(true)
          .all(...parameters);
      },
      execute,
    };
  }

  // D1の実行境界だけを置き換え、SQLと制約はSQLiteで実行する。
  const binding = {
    prepare,
    batch: async (statements: ReturnType<typeof prepare>[]) =>
      sqlite.transaction(() =>
        statements.map((statement) => statement.execute()),
      )(),
  } as unknown as D1Database;

  return { sqlite, hooks, binding, db: drizzle(binding, { schema }) };
}
