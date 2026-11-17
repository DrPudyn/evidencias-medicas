CREATE TABLE `user_passkeys` (
	`credential_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`transports` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_passkeys_user` ON `user_passkeys` (`user_id`);
--> statement-breakpoint
CREATE TABLE `passkey_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`challenge` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`expires_at` integer NOT NULL
);
