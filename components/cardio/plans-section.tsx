import { PLAN_LIMITS, readPlanPriceLabel } from "@/lib/plans";
import { settings } from "@/lib/server";

function priceLabel() {
  try { return readPlanPriceLabel(settings().PLAN_PRICE_LABEL); }
  catch { return readPlanPriceLabel(null); }
}

export function PlansSection({ lang }: { lang: "pt" | "en" }) {
  const en = lang === "en";
  const price = `${priceLabel()}/mês`;
  const register = en ? "/en/register" : "/pt/cadastro";
  const guide = en ? "/en/guide" : "/pt/guia";
  const weekly = en ? "/en/article" : "/pt/artigo-da-semana";
  return (
    <section className="plans">
      <div className="container">
        <div className="section-top">
          <div>
            <p id="planos" className="eyebrow">{en ? "PLANS" : "PLANOS"}</p>
            <h2>{en ? "Two limits. The same sources." : "Dois limites. As mesmas fontes."}</h2>
          </div>
          <p className="features-intro">{en
            ? "PubMed search, the library and this guide stay available. The paid plan is not open for checkout yet."
            : "A busca no PubMed, a biblioteca e este guia continuam disponíveis. O plano pago ainda não abre checkout."}</p>
        </div>
        <div className="plan-grid">
          <article className="glass-card plan-card">
            <p className="eyebrow">{en ? "FREE" : "GRÁTIS"}</p>
            <h3>{en ? "Free plan" : "Plano grátis"}</h3>
            <p className="plan-price">{en ? "R$ 0" : "R$ 0"}</p>
            <ul>
              <li>{en ? `${PLAN_LIMITS.free} clinical questions with AI per day, with an account.` : `${PLAN_LIMITS.free} perguntas clínicas com IA por dia, com conta.`}</li>
              <li>{en ? "PubMed search." : "Busca no PubMed."}</li>
              <li>{en ? "Favorites library." : "Biblioteca de favoritos."}</li>
              <li><a href={guide}>{en ? "Search guide." : "Guia de busca."}</a></li>
            </ul>
            <a className="button secondary" href={register}>{en ? "Create a free account" : "Criar conta grátis"}</a>
          </article>
          <article className="glass-card plan-card plan-featured">
            <p className="eyebrow">PREMIUM</p>
            <h3>{en ? "Premium plan" : "Plano Premium"}</h3>
            <p className="plan-price">{price}</p>
            <ul>
              <li>{en ? `${PLAN_LIMITS.subscriber} clinical questions per day.` : `${PLAN_LIMITS.subscriber} perguntas clínicas por dia.`}</li>
              <li>{en ? "Everything in the free plan." : "Tudo do plano grátis."}</li>
              <li><a href={weekly}>{en ? "A detailed weekly summary of one current, relevant article in your specialty." : "Resumo semanal detalhado de um artigo relevante e atual da sua especialidade."}</a></li>
            </ul>
            <button className="button" type="button" disabled>{en ? "Coming soon" : "Em breve"}</button>
          </article>
        </div>
      </div>
    </section>
  );
}
