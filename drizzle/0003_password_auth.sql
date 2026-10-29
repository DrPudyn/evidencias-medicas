ALTER TABLE users ADD COLUMN password_hash TEXT;
--> statement-breakpoint
CREATE TABLE password_resets (
  digest TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX password_resets_email ON password_resets(email);

-- Existing sessions and challenges retain their original expiration.
