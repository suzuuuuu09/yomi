#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]] || [[ "$1" != "--local" && "$1" != "--remote" ]]; then
  echo "Usage: $0 --local|--remote" >&2
  exit 2
fi

target="$1"
database="yomi_db"
wrangler_options=()

if [[ -n "${D1_PERSIST_TO:-}" ]]; then
  wrangler_options+=(--persist-to "$D1_PERSIST_TO")
fi

# Older environments were initialized with `wrangler d1 execute --file` and
# therefore have the baseline tables but no Wrangler migration ledger. Mark
# the baseline entry when its tables are present and later entries only when
# their final schema is present; fresh databases are left empty so Wrangler
# applies every migration in order.
bootstrap_sql=$(cat <<'SQL'
CREATE TABLE IF NOT EXISTS "d1_migrations" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT UNIQUE,
  "applied_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT OR IGNORE INTO "d1_migrations" ("name")
SELECT '0000_superb_penance.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'accounts')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'books')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'reading_logs')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'reading_notes')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sessions')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'verifications');
INSERT OR IGNORE INTO "d1_migrations" ("name")
SELECT '0001_reading_log_settings.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'reading_timezone')
  AND EXISTS (SELECT 1 FROM pragma_table_info('books') WHERE name = 'archived_at')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_books_user_archived');
INSERT OR IGNORE INTO "d1_migrations" ("name")
SELECT '0002_strong_human_robot.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'reading_day_offset')
  AND EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'reading_timezone_revision')
  AND EXISTS (SELECT 1 FROM pragma_table_info('reading_logs') WHERE name = 'reading_day')
  AND EXISTS (SELECT 1 FROM pragma_table_info('reading_logs') WHERE name = 'reading_timezone_revision')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_reading_logs_book_revision_date');
SQL
)

pnpm exec wrangler d1 execute "$database" "$target" "${wrangler_options[@]}" --command "$bootstrap_sql"
pnpm exec wrangler d1 migrations apply "$database" "$target" "${wrangler_options[@]}"
