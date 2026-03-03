CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` TEXT,
	`refreshTokenExpiresAt` TEXT,
	`scope` text,
	`password` text,
	`createdAt` TEXT NOT NULL,
	`updatedAt` TEXT NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_books_user_id` ON `books` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_books_user_status` ON `books` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_books_user_genre` ON `books` (`user_id`,`genre`);--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pages_read` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reading_logs_book_date` ON `reading_logs` (`book_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_reading_logs_user_date` ON `reading_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `reading_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`page` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reading_notes_book_id` ON `reading_notes` (`book_id`);--> statement-breakpoint
CREATE INDEX `idx_reading_notes_user_id` ON `reading_notes` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` TEXT NOT NULL,
	`token` text NOT NULL,
	`createdAt` TEXT NOT NULL,
	`updatedAt` TEXT NOT NULL,
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
	`emailVerified` integer DEFAULT 0 NOT NULL,
	`image` text,
	`createdAt` TEXT NOT NULL,
	`updatedAt` TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` TEXT NOT NULL,
	`createdAt` TEXT,
	`updatedAt` TEXT
);
