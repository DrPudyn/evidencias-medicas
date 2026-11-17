import { billingConfigured } from "@/lib/billing/stripe";
import { PLAN_LIMITS, PLAN_PRICE_PERIOD, PLAN_PRICE_PROVISIONAL, readPlanPriceLabel } from "@/lib/plans";
import { currentUser, json, settings } from "@/lib/server";

export async function GET(req: Request) {
  const env = settings();
  const billing = billingConfigured(env);
  let currentPlan: "free" | "subscriber" | null = null;
  try {
    const user = await currentUser(req);
    if (user) {
      const row = await env.DB.prepare("SELECT plan, status FROM subscriptions WHERE user_id = ?").bind(user.id).first<{ plan: string; status: string }>();
      currentPlan = row?.plan === "subscriber" && (row.status === "active" || row.status === "trialing") ? "subscriber" : "free";
    }
  } catch {
    currentPlan = null;
  }
  return json({
    priceLabel: readPlanPriceLabel(env.PLAN_PRICE_LABEL),
    period: PLAN_PRICE_PERIOD,
    provisional: PLAN_PRICE_PROVISIONAL,
    limits: PLAN_LIMITS,
    billing,
    currentPlan,
  });
}
