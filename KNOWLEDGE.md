# Project Knowledge

**Cloudflare D1 write results**
Cloudflare D1 write statements should be treated as returning execution metadata, not updated rows. When an API needs the canonical row after an INSERT or UPDATE, issue an explicit read after the write (or use an explicitly supported D1 batch/session pattern); do not rely on Drizzle's SQLite `.returning()` being available through the D1 binding.

**Cloudflare D1 atomic writes**
With the repository's Drizzle D1 adapter, `db.transaction()` emits SQL `BEGIN`, which D1 rejects. Use D1/Drizzle `batch()` for related statements that must commit or roll back together, and use compare-and-set predicates when reads are needed before constructing the batch.

*Avoid*: Calling Drizzle `db.transaction()` on a D1-backed database.

**pnpm lifecycle build approvals**
With pnpm 11, every dependency listed under `allowBuilds` must have an explicit boolean value. Placeholder values such as `set this to true or false` make a clean `pnpm install --frozen-lockfile` fail with `ERR_PNPM_IGNORED_BUILDS`. Keep native dependencies that the application needs, such as `better-sqlite3`, explicitly allowed and keep unused transitive tooling dependencies explicitly denied.

**D1 migration execution**
The checked-in D1 migrations live in `drizzle/`, so the D1 binding in `wrangler.jsonc` must set `migrations_dir` to `drizzle`. `pnpm dev` does not apply migrations automatically; run `pnpm db:migrate:local` before using a schema change locally. Legacy D1 instances initialized with SQL files may lack Wrangler's migration ledger; `scripts/migrate-d1.sh` bootstraps the baseline entry when its tables are present and later entries only when their final schema is already present before applying the remaining migrations.
