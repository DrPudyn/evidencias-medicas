import { billingConfigured, stripePost } from "@/lib/billing/stripe";
import { currentUser, json, sameOrigin, settings } from "@/lib/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origem não autorizada." }, 403);
  const env = settings();
  if (!billingConfigured(env).portal || !env.STRIPE_SECRET_KEY) {
    return json({ error: "A cobrança ainda não está ativada.", enabled: false }, 503);
  }
  const user = await currentUser(req);
  if (!user) return json({ error: "Entre na conta para gerenciar a assinatura." }, 401);
  const row = await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").bind(user.id).first<{ stripe_customer_id: string | null }>();
  if (!row?.stripe_customer_id) return json({ error: "Esta conta ainda não tem uma assinatura para gerenciar." }, 404);
  const params = new URLSearchParams({
    customer: row.stripe_customer_id,
    return_url: `${new URL(req.url).origin}/pt#planos`,
  });
  try {
    const url = await stripePost(env.STRIPE_SECRET_KEY, "billing_portal/sessions", params);
    return json({ url });
  } catch {
    return json({ error: "Não foi possível abrir o portal do cliente." }, 502);
  }
}
