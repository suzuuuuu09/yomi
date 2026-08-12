DROP INDEX `idx_reading_logs_book_date`;--> statement-breakpoint
ALTER TABLE `users` ADD `reading_day_offset` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reading_timezone_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reading_logs` ADD `reading_day` integer;--> statement-breakpoint
ALTER TABLE `reading_logs` ADD `reading_timezone_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `reading_logs`
SET `reading_day` = CAST(strftime('%s', `date` || ' 00:00:00') / 86400 AS INTEGER) +
  COALESCE((SELECT `reading_day_offset` FROM `users` WHERE `users`.`id` = `reading_logs`.`user_id`), 0)
WHERE `reading_day` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reading_logs_book_revision_date` ON `reading_logs` (`book_id`,`reading_timezone_revision`,`date`);
