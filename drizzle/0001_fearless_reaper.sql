CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`outcome` text NOT NULL,
	`target_id` text,
	`identifier_hash` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `admin_bootstrap_state` (
	`singleton_id` integer PRIMARY KEY NOT NULL,
	`completion_challenge_id` text NOT NULL,
	`completed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_bootstrap_state_completion_challenge_id_unique` ON `admin_bootstrap_state` (`completion_challenge_id`);--> statement-breakpoint
CREATE TABLE `admin_credentials` (
	`credential_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text DEFAULT '[]' NOT NULL,
	`backup_eligible` integer DEFAULT 0 NOT NULL,
	`backup_state` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`base_session_digest` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `analytics_daily_counts` (
	`day` text NOT NULL,
	`event` text NOT NULL,
	`topic` text NOT NULL,
	`source` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `event`, `topic`, `source`)
);
--> statement-breakpoint
CREATE TABLE `analytics_visitor_days` (
	`visitor_hash` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`visitor_hash`, `day`),
	FOREIGN KEY (`visitor_hash`) REFERENCES `analytics_visitors`(`visitor_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `analytics_visitors` (
	`visitor_hash` text PRIMARY KEY NOT NULL,
	`first_seen_day` text NOT NULL,
	`last_seen_day` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_visits` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`visitor_hash` text NOT NULL,
	`day` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`visitor_hash`) REFERENCES `analytics_visitors`(`visitor_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `catalog_link_checks` (
	`url` text PRIMARY KEY NOT NULL,
	`status_code` integer,
	`result` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`checked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`reviewer_user_id` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_metrics` (
	`day` text NOT NULL,
	`service` text NOT NULL,
	`successes` integer DEFAULT 0 NOT NULL,
	`errors` integer DEFAULT 0 NOT NULL,
	`total_duration_ms` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `service`)
);
--> statement-breakpoint
CREATE TABLE `webauthn_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`base_session_digest` text NOT NULL,
	`kind` text NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_seen_at` integer DEFAULT 0 NOT NULL;