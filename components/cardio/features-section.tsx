"use client";

import { useLocale } from "@/components/locale-provider";

import { Bell, Bookmark, Compass, Search, type LucideIcon } from "lucide-react";

export function FeaturesSection() {
  const { t } = useLocale();
const features: [LucideIcon, string, string, string][] = [
  [Search, "01", t("Encontre com precisão"), t("Busque por doença, tratamento, autor ou PMID. Refine por tema, período e tipo de estudo.")],
  [Bookmark, "02", t("Construa sua biblioteca"), t("Guarde artigos na sua conta e retome a leitura quando fizer sentido para você.")],
  [Compass, "03", t("Pesquise com orientação"), t("Use o guia para transformar dúvidas em buscas mais claras e avaliar cada estudo.")],
  [Bell, "04", t("Escolha como acompanhar"), t("Defina suas preferências de e-mail e WhatsApp. Notificações em uma próxima etapa.")],
];
  return (
    <section id="recursos" className="features">
      <div className="container">
        <div className="section-top">
          <div>
            <div className="eyebrow">{t("FEITO PARA A SUA ROTINA")}</div>
            <h2>{" " + t("Menos dispersão.")}<br />{t("Mais conhecimento.") + " "}</h2>
          </div>
          <p className="features-intro">{t("Do primeiro contato com um tema à leitura aprofundada, um espaço para organizar sua atualização.")}</p>
        </div>
        <div className="feature-grid">
          {features.map(([Icon, number, title, description]) => (
            <div className="feature" key={number}>
              <div className="feature-heading">
                <Icon size={24} />
                <span>{number}</span>
              </div>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
