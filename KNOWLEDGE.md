# Project Knowledge

**Cloudflare D1 write results**
Cloudflare D1 write statements should be treated as returning execution metadata, not updated rows. When an API needs the canonical row after an INSERT or UPDATE, issue an explicit read after the write (or use an explicitly supported D1 batch/session pattern); do not rely on Drizzle's SQLite `.returning()` being available through the D1 binding.

**pnpm lifecycle build approvals**
With pnpm 11, every dependency listed under `allowBuilds` must have an explicit boolean value. Placeholder values such as `set this to true or false` make a clean `pnpm install --frozen-lockfile` fail with `ERR_PNPM_IGNORED_BUILDS`. Keep native dependencies that the application needs, such as `better-sqlite3`, explicitly allowed and keep unused transitive tooling dependencies explicitly denied.
