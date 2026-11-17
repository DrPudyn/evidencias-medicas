import { billingConfigured, stripePost } from "@/lib/billing/stripe";
import { currentUser, json, sameOrigin, settings } from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  const env = settings();
  const flags = billingConfigured(env);
  if (!flags.checkout || !env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return json({ error: "A cobrança ainda não está ativada.", enabled: false }, 503);
  }
  const user = await currentUser(req);
  if (!user) return json({ error: "Entre na conta para assinar." }, 401);
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/pt?billing=success#planos`,
    cancel_url: `${origin}/pt?billing=cancel#planos`,
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    "subscription_data[metadata][user_id]": user.id,
  });
  try {
    const url = await stripePost(env.STRIPE_SECRET_KEY, "checkout/sessions", params);
    return json({ url });
  } catch {
    return json({ error: "Não foi possível abrir o checkout." }, 502);
  }
}
