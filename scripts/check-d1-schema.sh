#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]] || [[ "$1" != "--local" && "$1" != "--remote" ]]; then
  echo "Usage: $0 --local|--remote" >&2
  exit 2
fi

schema_check_sql=$(cat <<'SQL'
SELECT archived_at FROM books LIMIT 0;
SELECT reading_timezone, reading_day_offset, reading_timezone_revision
FROM users
LIMIT 0;
SELECT reading_day, reading_timezone_revision
FROM reading_logs
LIMIT 0;
SELECT id, user_id FROM guest_book_imports LIMIT 0;
SELECT key, window, count FROM search_rate_limits LIMIT 0;
SQL
)

pnpm exec wrangler d1 execute yomi_db "$1" --command "$schema_check_sql"
