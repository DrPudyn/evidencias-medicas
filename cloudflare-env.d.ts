declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AI?: Ai;
    SITE_ORIGIN?: string;
    PLAN_PRICE_LABEL?: string;
    WORKERS_AI_MODEL?: string;
    CLINICAL_AI_PROVIDER?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_PRICE_ID?: string;
    LOCAL_PREVIEW_ENABLED?: string;
  }
}
