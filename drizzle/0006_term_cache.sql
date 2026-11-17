CREATE TABLE `clinical_term_cache` (
	`question_key` text PRIMARY KEY NOT NULL,
	`concepts` text NOT NULL,
	`updated_at` integer NOT NULL
);
