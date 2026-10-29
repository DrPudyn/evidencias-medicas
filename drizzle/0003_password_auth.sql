ALTER TABLE users ADD COLUMN password_hash TEXT;
--> statement-breakpoint
CREATE TABLE password_resets (
  digest TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX password_resets_email ON password_resets(email);
--> statement-breakpoint
-- Retire sessions and challenges issued by the former code-based login.
DELETE FROM admin_sessions;
--> statement-breakpoint
DELETE FROM webauthn_challenges;
--> statement-breakpoint
DELETE FROM sessions;
--> statement-breakpoint
DELETE FROM challenges;
