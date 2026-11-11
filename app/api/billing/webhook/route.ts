import { applyStripeEvent, verifyStripeSignature, type StripeEvent } from "@/lib/billing/stripe";
import { json, settings } from "@/lib/server";

export async function POST(req: Request) {
  const env = settings();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook de cobrança desativado." }, 503);
  const payload = await req.text();
  if (payload.length > 200_000) return json({ error: "Pedido grande demais." }, 413);
  const valid = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret);
  if (!valid) return json({ error: "Assinatura inválida." }, 400);
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return json({ error: "Evento inválido." }, 400);
  }
  try {
    const status = await applyStripeEvent(env.DB, event);
    return json({ received: true, status });
  } catch {
    return json({ error: "Não foi possível aplicar o evento." }, 500);
  }
}
