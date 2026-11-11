export type BillingEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
};

export type BillingFlags = { checkout: boolean; portal: boolean; webhook: boolean };

export function billingConfigured(env: BillingEnv): BillingFlags {
  const secret = Boolean(env.STRIPE_SECRET_KEY);
  return {
    checkout: secret && Boolean(env.STRIPE_PRICE_ID),
    portal: secret,
    webhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
  };
}

function webhookKeyBytes(secret: string) {
  if (secret.startsWith("whsec_")) {
    const binary = atob(secret.slice("whsec_".length));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new TextEncoder().encode(secret);
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", webhookKeyBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function signStripePayload(secret: string, payload: string, timestamp: number) {
  const signature = await hmacHex(secret, `${timestamp}.${payload}`);
  return `t=${timestamp},v1=${signature}`;
}

export async function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header || !secret) return false;
  const pieces = header.split(",").map((part) => part.trim());
  const timestamp = pieces.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = pieces.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > 300) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

export type Sql = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      first: <T>() => Promise<T | null>;
      run: () => Promise<{ meta?: { changes?: number } }>;
    };
  };
};

type StripeObject = Record<string, unknown>;
export type StripeEvent = { id: string; type: string; data?: { object?: StripeObject } };

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function userIdFrom(object: StripeObject) {
  const metadata = object.metadata && typeof object.metadata === "object" ? object.metadata as Record<string, unknown> : {};
  const id = asString(metadata.user_id) || asString(object.client_reference_id);
  return /^[a-zA-Z0-9_-]{8,80}$/.test(id) ? id : "";
}

async function userIdForSubscription(db: Sql, object: StripeObject) {
  const direct = userIdFrom(object);
  if (direct) return direct;
  const subscriptionId = asString(object.id);
  if (!subscriptionId) return "";
  const row = await db.prepare("SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?").bind(subscriptionId).first<{ user_id: string }>();
  return row?.user_id || "";
}

function entitlement(status: string) {
  const active = status === "active" || status === "trialing";
  return { plan: active ? "subscriber" : "free", status: active ? "active" : status || "canceled" };
}

async function saveSubscription(db: Sql, input: {
  userId: string;
  plan: string;
  status: string;
  customerId: string;
  subscriptionId: string;
  periodEnd: number | null;
}) {
  await db.prepare(
    `INSERT INTO subscriptions (user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       plan = excluded.plan,
       status = excluded.status,
       stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
       stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
       current_period_end = excluded.current_period_end,
       updated_at = excluded.updated_at`,
  ).bind(
    input.userId,
    input.plan,
    input.status,
    input.customerId || null,
    input.subscriptionId || null,
    input.periodEnd,
    Date.now(),
  ).run();
}

export async function applyStripeEvent(db: Sql, event: StripeEvent): Promise<"duplicate" | "ignored" | "updated"> {
  if (!event?.id || !event.type) return "ignored";
  try {
    await db.prepare("INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)").bind(event.id, event.type, Date.now()).run();
  } catch {
    return "duplicate";
  }
  try {
    const object = event.data?.object || {};
    if (event.type === "checkout.session.completed") {
      if (object.mode !== "subscription") return "ignored";
      const userId = userIdFrom(object);
      if (!userId) return "ignored";
      await saveSubscription(db, {
        userId,
        plan: "subscriber",
        status: "active",
        customerId: asString(object.customer),
        subscriptionId: asString(object.subscription),
        periodEnd: null,
      });
      return "updated";
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const userId = await userIdForSubscription(db, object);
      if (!userId) return "ignored";
      const status = event.type === "customer.subscription.deleted" ? "canceled" : asString(object.status) || "canceled";
      const next = entitlement(status);
      const period = typeof object.current_period_end === "number" ? object.current_period_end : null;
      await saveSubscription(db, {
        userId,
        plan: next.plan,
        status: next.status,
        customerId: asString(object.customer),
        subscriptionId: asString(object.id),
        periodEnd: period,
      });
      return "updated";
    }
    return "ignored";
  } catch (error) {
    await db.prepare("DELETE FROM stripe_events WHERE id = ?").bind(event.id).run().catch(() => undefined);
    throw error;
  }
}

export async function stripePost(secret: string, path: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({})) as { url?: string; error?: { message?: string } };
  if (!response.ok || !data.url) {
    throw new Error("O serviço de pagamento não concluiu o pedido.");
  }
  if (!data.url.startsWith("https://")) throw new Error("O serviço de pagamento devolveu um endereço inválido.");
  return data.url;
}
