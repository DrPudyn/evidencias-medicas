import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  profile: text("profile").notNull(),
  passwordHash: text("password_hash"),
  emailVerifiedAt: integer("email_verified_at"),
  createdAt: integer("created_at").notNull(),
});
export const challenges = sqliteTable("challenges", {
  email: text("email").primaryKey(),
  digest: text("digest").notNull(),
  salt: text("salt").notNull(),
  payload: text("payload").notNull(),
  expires: integer("expires").notNull(),
  attempts: integer("attempts").notNull().default(0),
  sentAt: integer("sent_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  digest: text("digest").primaryKey(),
  authMethod: text("auth_method"),
  userId: text("user_id").notNull().references(() => users.id),
  expires: integer("expires").notNull(),
  createdAt: integer("created_at").notNull().default(0),
  lastSeenAt: integer("last_seen_at").notNull().default(0),
});
export const bookmarks = sqliteTable("bookmarks", {
  userId: text("user_id").notNull().references(() => users.id),
  articleId: text("article_id").notNull(),
  article: text("article").notNull(),
  reading: text("reading").notNull().default('{"folder":"","tags":[],"notes":"","status":"later"}'),
  createdAt: integer("created_at").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.articleId] })]);
export const limits = sqliteTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});

export const adminCredentials = sqliteTable("admin_credentials", {
  credentialId: text("credential_id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports").notNull().default("[]"),
  backupEligible: integer("backup_eligible").notNull().default(0),
  backupState: integer("backup_state").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at"),
});
export const webauthnChallenges = sqliteTable("webauthn_challenges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  baseSessionDigest: text("base_session_digest").notNull(),
  kind: text("kind").notNull(),
  challenge: text("challenge").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const adminBootstrapState = sqliteTable("admin_bootstrap_state", {
  singletonId: integer("singleton_id").primaryKey(),
  completionChallengeId: text("completion_challenge_id").notNull().unique(),
  completedAt: integer("completed_at").notNull(),
});
export const adminSessions = sqliteTable("admin_sessions", {
  digest: text("digest").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  baseSessionDigest: text("base_session_digest").notNull(),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  expires: integer("expires").notNull(),
  revokedAt: integer("revoked_at"),
});
export const adminAuditLog = sqliteTable("admin_audit_log", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  targetId: text("target_id"),
  identifierHash: text("identifier_hash"),
  createdAt: integer("created_at").notNull(),
});
export const analyticsVisitors = sqliteTable("analytics_visitors", {
  visitorHash: text("visitor_hash").primaryKey(),
  firstSeenDay: text("first_seen_day").notNull(),
  lastSeenDay: text("last_seen_day").notNull(),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});
export const analyticsVisitorDays = sqliteTable("analytics_visitor_days", {
  visitorHash: text("visitor_hash").notNull().references(() => analyticsVisitors.visitorHash),
  day: text("day").notNull(),
}, (t) => [primaryKey({ columns: [t.visitorHash, t.day] })]);
export const analyticsVisits = sqliteTable("analytics_visits", {
  sessionHash: text("session_hash").primaryKey(),
  visitorHash: text("visitor_hash").notNull().references(() => analyticsVisitors.visitorHash),
  day: text("day").notNull(),
  startedAt: integer("started_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});
export const analyticsDailyCounts = sqliteTable("analytics_daily_counts", {
  day: text("day").notNull(),
  event: text("event").notNull(),
  topic: text("topic").notNull(),
  source: text("source").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.event, t.topic, t.source] })]);
export const serviceMetrics = sqliteTable("service_metrics", {
  day: text("day").notNull(),
  service: text("service").notNull(),
  successes: integer("successes").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  totalDurationMs: integer("total_duration_ms").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.service] })]);
export const integrationRateSlots = sqliteTable("integration_rate_slots", {
  service: text("service").primaryKey(),
  nextAt: integer("next_at").notNull(),
});
export const catalogLinkChecks = sqliteTable("catalog_link_checks", {
  url: text("url").primaryKey(),
  statusCode: integer("status_code"),
  result: text("result").notNull(),
  durationMs: integer("duration_ms").notNull(),
  checkedAt: integer("checked_at").notNull(),
});
export const catalogReviews = sqliteTable("catalog_reviews", {
  id: text("id").primaryKey(),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => users.id),
  reviewedAt: integer("reviewed_at").notNull(),
});

export const passwordResets = sqliteTable("password_resets", {
  digest: text("digest").primaryKey(),
  email: text("email").notNull(),
  expires: integer("expires").notNull(),
});

export const emailVerifications=sqliteTable("email_verifications",{
 digest:text("digest").primaryKey(),
 email:text("email").notNull(),
 passwordHash:text("password_hash").notNull(),
 expires:integer("expires").notNull()
});

export const savedSearches = sqliteTable("saved_searches", {
 id: text("id").primaryKey(), userId: text("user_id").notNull().references(()=>users.id),
 name: text("name").notNull(), query: text("query").notNull(), checkedAt: integer("checked_at").notNull(), seenIds: text("seen_ids").notNull().default("[]"),
}, t => [index("saved_searches_user").on(t.userId)]);
export const editorialVersions = sqliteTable("editorial_versions", {
 id: text("id").primaryKey(), articleId: text("article_id").notNull(), actorUserId: text("actor_user_id").notNull().references(()=>users.id),
 content: text("content").notNull(), status: text("status").notNull(), createdAt: integer("created_at").notNull(),
}, t => [index("editorial_article").on(t.articleId,t.createdAt)]);
