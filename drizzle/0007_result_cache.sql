CREATE TABLE `clinical_result_cache` (
	`query_key` text PRIMARY KEY NOT NULL,
	`pmids` text NOT NULL,
	`updated_at` integer NOT NULL
);
