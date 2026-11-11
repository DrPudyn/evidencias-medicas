"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PLAN_LIMITS, PLAN_PRICE_PERIOD, PLAN_PRICE_PROVISIONAL, readPlanPriceLabel } from "@/lib/plans";
import { DEFAULT_PLAN_PRICE_LABEL } from "@/lib/brand";
import { useLocale } from "@/components/locale-provider";
import { Reveal } from "@/components/reveal";

type PlansPayload = {
  priceLabel: string;
  period: string;
  provisional: boolean;
  limits: { anonymous: number; free: number; subscriber: number };
  billing: { checkout: boolean; portal: boolean };
  currentPlan: "free" | "subscriber" | null;
};

const initial: PlansPayload = {
  priceLabel: DEFAULT_PLAN_PRICE_LABEL,
  period: PLAN_PRICE_PERIOD,
  provisional: PLAN_PRICE_PROVISIONAL,
  limits: PLAN_LIMITS,
  billing: { checkout: false, portal: false },
  currentPlan: null,
};

export function PlansSection({ signedIn, onAccount }: { signedIn: boolean; onAccount: () => void }) {
  const { t, locale } = useLocale();
  const [plans, setPlans] = useState(initial);
  const [actionNotice, setActionNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<"checkout" | "portal" | "">("");
  const urlNotice = useSyncExternalStore(
    () => () => {},
    () => {
      const billing = new URLSearchParams(window.location.search).get("billing");
      if (billing === "success") {
        return locale === "en"
          ? "If payment finished, the subscription starts when the webhook confirms it."
          : "Se o pagamento foi concluído, a assinatura passa a valer quando o webhook confirmar.";
      }
      if (billing === "cancel") {
        return locale === "en" ? "Checkout was canceled. Nothing was charged here." : "O checkout foi cancelado. Nada foi cobrado por aqui.";
      }
      return "";
    },
    () => "",
  );

  useEffect(() => {
    void fetch("/api/plans").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as Partial<PlansPayload>;
      setPlans((current) => ({
        ...current,
        ...data,
        priceLabel: readPlanPriceLabel(data.priceLabel),
        limits: data.limits || current.limits,
        billing: data.billing || current.billing,
      }));
    }).catch(() => undefined).finally(() => setLoaded(true));
  }, [locale]);

  async function openBilling(path: "checkout" | "portal") {
    if (!signedIn) {
      onAccount();
      return;
    }
    setPending(path);
    setActionNotice("");
    try {
      const response = await fetch(`/api/billing/${path}`, { method: "POST" });
      const data = await response.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setActionNotice(data.error || t("A cobrança ainda não está ativada."));
    } catch {
      setActionNotice(t("A cobrança ainda não está ativada."));
    } finally {
      setPending("");
    }
  }

  const price = `${plans.priceLabel}${plans.period}`;
  return (
    <section id="planos" className="plans">
      <div className="container">
        <Reveal>
          <div className="section-top">
            <div>
              <p className="eyebrow">{t("PLANOS")}</p>
              <h2>{t("Perguntas por dia, com preço ainda provisório.")}</h2>
            </div>
            <p className="features-intro">{t("A busca no PubMed, o catálogo e a biblioteca não entram nesta cobrança. O número abaixo é a faixa prevista, não um preço em vigor.")}</p>
          </div>
          {plans.provisional && <p className="provisional-flag">{t("Valor provisório")}</p>}
          <div className="plan-grid">
            <article className="glass-card plan-card">
              <p className="eyebrow">{t("GRÁTIS")}</p>
              <h3>{t("Para experimentar")}</h3>
              <p className="plan-price">{t("R$ 0")}</p>
              <ul>
                <li>{t("Sem conta")}: {plans.limits.anonymous} {t("pergunta por dia, por rede")}</li>
                <li>{t("Com conta")}: {plans.limits.free} {t("perguntas por dia")}</li>
                <li>{t("Biblioteca, buscas salvas e fichas publicadas continuam disponíveis.")}</li>
              </ul>
              <button className="button secondary" type="button" onClick={onAccount}>{signedIn ? t("Minha conta") : t("Criar conta grátis")}</button>
            </article>
            <article className="glass-card plan-card plan-featured">
              <p className="eyebrow">{t("ASSINANTE")}</p>
              <h3>{t("Para a rotina")}</h3>
              <p className="plan-price">{price}</p>
              <p className="provisional-inline">{t("Faixa prevista. Nada é cobrado enquanto a cobrança estiver desligada.")}</p>
              <ul>
                <li>{plans.limits.subscriber} {t("perguntas clínicas por dia")}</li>
                <li>{t("Mesma regra: a síntese só usa registros recuperados no PubMed.")}</li>
                {signedIn && loaded && <li>{plans.currentPlan === "subscriber" ? t("Sua conta está como assinante.") : t("Sua conta ainda não está como assinante.")}</li>}
              </ul>
              <button className="button" type="button" disabled={pending === "checkout"} onClick={() => void openBilling("checkout")}>
                {plans.billing.checkout ? t("Assinar") : t("Cobrança ainda não ativada")}
              </button>
              {plans.billing.portal && (
                <button className="text-button plan-portal" type="button" disabled={pending === "portal"} onClick={() => void openBilling("portal")}>
                  {t("Portal do cliente")}
                </button>
              )}
            </article>
          </div>
          {(actionNotice || urlNotice) && <p className="plan-notice" role="status">{actionNotice || urlNotice}</p>}
        </Reveal>
      </div>
    </section>
  );
}
