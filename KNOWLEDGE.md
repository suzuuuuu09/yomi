# Project Knowledge

**Cloudflare D1 write results**
Cloudflare D1 write statements should be treated as returning execution metadata, not updated rows. When an API needs the canonical row after an INSERT or UPDATE, issue an explicit read after the write (or use an explicitly supported D1 batch/session pattern); do not rely on Drizzle's SQLite `.returning()` being available through the D1 binding.
