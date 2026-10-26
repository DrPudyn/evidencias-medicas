"use client";

import { Bell, Bookmark, Compass, Search, type LucideIcon } from "lucide-react";

const features: [LucideIcon, string, string, string][] = [
  [Search, "01", "Encontre com precisão", "Busque por doença, tratamento, autor ou PMID. Refine por tema, período e tipo de estudo."],
  [Bookmark, "02", "Construa sua biblioteca", "Guarde artigos na sua conta e retome a leitura quando fizer sentido para você."],
  [Compass, "03", "Pesquise com orientação", "Use o guia para transformar dúvidas em buscas mais claras e avaliar cada estudo."],
  [Bell, "04", "Escolha como acompanhar", "Defina suas preferências de e-mail e WhatsApp. Notificações em uma próxima etapa."],
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="features">
      <div className="container">
        <div className="section-top">
          <div>
            <div className="eyebrow">FEITO PARA A SUA ROTINA</div>
            <h2>
              Menos dispersão.<br />Mais conhecimento.
            </h2>
          </div>
          <p className="features-intro">Do primeiro contato com um tema à leitura aprofundada, um espaço para organizar sua atualização.</p>
        </div>
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
      </div>
    </section>
  );
}
