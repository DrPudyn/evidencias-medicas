import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { applyStripeEvent, billingConfigured, signStripePayload, verifyStripeSignature, type Sql, type StripeEvent } from "./stripe";

const secret = `whsec_${btoa("stripe-test-secret")}`;

function memoryDb(): Sql & { get(sql: string, ...params: unknown[]): Record<string, unknown> | null } {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE subscriptions (
      user_id text PRIMARY KEY NOT NULL,
      plan text NOT NULL,
      status text NOT NULL,
      stripe_customer_id text,
      stripe_subscription_id text,
      current_period_end integer,
      updated_at integer NOT NULL
    );
    CREATE TABLE stripe_events (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      received_at integer NOT NULL
    );
  `);
  const api: Sql = {
    prepare(sql: string) {
      const statement = db.prepare(sql);
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              const row = statement.get(...(params as never[])) as T | undefined;
              return row ?? null;
            },
            async run() {
              const info = statement.run(...(params as never[]));
              return { meta: { changes: Number(info.changes) } };
            },
          };
        },
      };
    },
  };
  return Object.assign(api, {
    get(sql: string, ...params: unknown[]) {
      const row = db.prepare(sql).get(...(params as never[])) as Record<string, unknown> | undefined;
      return row ?? null;
    },
  });
}

test("webhook sem chave fica desligado e a assinatura rejeita segredo errado ou expirado", async () => {
  assert.deepEqual(billingConfigured({}), { checkout: false, portal: false, webhook: false });
  assert.equal(billingConfigured({ STRIPE_SECRET_KEY: "sk_test", STRIPE_PRICE_ID: "price_test" }).checkout, true);
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1_700_000_000_000;
  const header = await signStripePayload(secret, payload, Math.floor(now / 1000));
  assert.equal(await verifyStripeSignature(payload, header, secret, now), true);
  assert.equal(await verifyStripeSignature(payload, header, `whsec_${btoa("other")}`, now), false);
  assert.equal(await verifyStripeSignature(`${payload} `, header, secret, now), false);
  assert.equal(await verifyStripeSignature(payload, header, secret, now + 600_000), false);
  assert.equal(await verifyStripeSignature(payload, null, secret, now), false);
});

test("webhook ativa e cancela o plano, ignora evento repetido e citação sem usuário", async () => {
  const db = memoryDb();
  const userId = "11111111-2222-4333-8444-555555555555";
  const completed: StripeEvent = {
    id: "evt_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        mode: "subscription",
        client_reference_id: userId,
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { user_id: userId },
      },
    },
  };
  assert.equal(await applyStripeEvent(db, completed), "updated");
  assert.equal(await applyStripeEvent(db, completed), "duplicate");
  const active = db.get("SELECT plan, status, stripe_customer_id, stripe_subscription_id FROM subscriptions WHERE user_id = ?", userId);
  assert.equal(active?.plan, "subscriber");
  assert.equal(active?.status, "active");
  assert.equal(active?.stripe_customer_id, "cus_123");

  const removed: StripeEvent = {
    id: "evt_delete",
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_123", customer: "cus_123", status: "canceled" } },
  };
  assert.equal(await applyStripeEvent(db, removed), "updated");
  const canceled = db.get("SELECT plan, status FROM subscriptions WHERE user_id = ?", userId);
  assert.equal(canceled?.plan, "free");
  assert.equal(canceled?.status, "canceled");

  const orphan: StripeEvent = {
    id: "evt_orphan",
    type: "checkout.session.completed",
    data: { object: { mode: "subscription", customer: "cus_x", subscription: "sub_x" } },
  };
  assert.equal(await applyStripeEvent(db, orphan), "ignored");
  assert.equal(db.get("SELECT COUNT(*) AS total FROM subscriptions")?.total, 1);
});
