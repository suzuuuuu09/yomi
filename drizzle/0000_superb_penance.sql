CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`isbn` text DEFAULT '',
	`total_pages` integer DEFAULT 0 NOT NULL,
	`current_page` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`genre` text DEFAULT '' NOT NULL,
	`cover_url` text DEFAULT '',
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`position_z` real DEFAULT 0 NOT NULL,
	`brightness` real DEFAULT 0.15 NOT NULL,
	`color` text DEFAULT '#FFFFFF' NOT NULL,
	`registered_at` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_books_total_pages" CHECK("books"."total_pages" >= 0),
	CONSTRAINT "chk_books_current_page" CHECK("books"."current_page" >= 0),
	CONSTRAINT "chk_books_current_lte_total" CHECK("books"."current_page" <= "books"."total_pages" OR "books"."total_pages" = 0),
	CONSTRAINT "chk_books_valid_status" CHECK("books"."status" IN ('unread', 'reading', 'completed'))
);
--> statement-breakpoint
CREATE INDEX `idx_books_user_id` ON `books` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_books_user_status` ON `books` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_books_user_genre` ON `books` (`user_id`,`genre`);--> statement-breakpoint
CREATE INDEX `idx_books_user_current_page` ON `books` (`user_id`,`current_page`);--> statement-breakpoint
CREATE INDEX `idx_books_user_total_pages` ON `books` (`user_id`,`total_pages`);--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pages_read` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_logs_pages_read" CHECK("reading_logs"."pages_read" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reading_logs_book_date` ON `reading_logs` (`book_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_reading_logs_user_date` ON `reading_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_reading_logs_user_book` ON `reading_logs` (`user_id`,`book_id`);--> statement-breakpoint
CREATE TABLE `reading_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`page` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_notes_page" CHECK("reading_notes"."page" >= 1 OR "reading_notes"."page" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_reading_notes_book_id` ON `reading_notes` (`book_id`);--> statement-breakpoint
CREATE INDEX `idx_reading_notes_user_id` ON `reading_notes` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
