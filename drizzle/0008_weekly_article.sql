CREATE TABLE `weekly_article` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
