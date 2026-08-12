ALTER TABLE `users` ADD COLUMN `reading_timezone` text;
--> statement-breakpoint
ALTER TABLE `books` ADD COLUMN `archived_at` text;
--> statement-breakpoint
CREATE INDEX `idx_books_user_archived` ON `books` (`user_id`,`archived_at`);
