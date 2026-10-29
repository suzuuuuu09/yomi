CREATE TABLE "guest_book_imports" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_guest_book_imports_user" ON "guest_book_imports" ("user_id");
CREATE TABLE "search_rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "window" integer NOT NULL,
  "count" integer NOT NULL
);
