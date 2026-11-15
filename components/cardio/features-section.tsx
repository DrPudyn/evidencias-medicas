"use client";

import { useLocale } from "@/components/locale-provider";

import { Reveal } from "@/components/reveal";
import { Bell, Bookmark, Compass, Search, type LucideIcon } from "lucide-react";

export function FeaturesSection() {
  const { t } = useLocale();
const features: [LucideIcon, string, string, string][] = [
  [Search, "01", t("Pergunte em português"), t("A pergunta clínica gera a busca e resume só revisões, metanálises e diretrizes recuperadas no PubMed.")],
  [Bookmark, "02", t("Construa sua biblioteca"), t("Guarde artigos na sua conta e retome a leitura quando fizer sentido para você.")],
  [Compass, "03", t("Pesquise com orientação"), t("Use o guia para transformar dúvidas em buscas mais claras e avaliar cada estudo.")],
  [Bell, "04", t("Acesse com simplicidade"), t("Entre com e-mail e senha. Sem nome, CRM ou telefone nesta etapa.")],
];
  return (
    <section className="features">
      <div className="container">
        <div className="section-top">
          <div>
            <div id="recursos" className="eyebrow">{t("FEITO PARA A SUA ROTINA")}</div>
            <h2>{" " + t("Menos dispersão.")}<br />{t("Mais conhecimento.") + " "}</h2>
          </div>
          <p className="features-intro">{t("Do primeiro contato com um tema à leitura aprofundada, um espaço para organizar sua atualização.")}</p>
        </div>
        <Reveal>
          <div className="feature-grid">
            {features.map(([Icon, number, title, description]) => (
              <div className="feature" key={number}>
                <div className="feature-heading">
                  <Icon size={24} />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
