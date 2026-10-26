"use client";

import type { FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Check, CheckCircle2, Heart, Search, ShieldCheck } from "lucide-react";

export function HeroSection({
  q,
  onQueryChange,
  onSearch,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  onSearch: (event?: FormEvent) => void;
}) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> CONHECIMENTO QUE ACOMPANHA VOCÊ
          </div>
          <h1>
            A ciência avança.<br />Sua prática <em>também.</em>
          </h1>
          <p>Encontre evidências em diferentes especialidades médicas, refine sua busca e mantenha suas próximas leituras sempre por perto.</p>
          <form className="hero-search" onSubmit={onSearch}>
            <Search size={22} />
            <input
              aria-label="Buscar artigos no PubMed por título, resumo e descritores"
              placeholder="Ex.: diabetes tipo 2, asma ou câncer de mama"
              value={q}
              onChange={(event) => onQueryChange(event.target.value)}
              maxLength={200}
            />
            <button className="button" type="submit">
              Buscar <ArrowRight size={18} />
            </button>
          </form>
          <p className="search-hint">A busca considera título, resumo e MeSH. Termos separados usam AND; use OR para alternativas.</p>
          <div className="hero-trust">
            <span>
              <CheckCircle2 size={15} /> Gratuito nesta fase
            </span>
            <span>
              <ShieldCheck size={15} /> Fontes científicas identificadas
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-cross cross-one">+</span>
          <span className="art-cross cross-two">+</span>
          <div className="science-card">
            <div className="science-top">
              <span>
                <Heart size={15} /> EVIDÊNCIAS MÉDICAS
              </span>
              <span className="tiny-dot" />
            </div>
            <div className="pulse-illustration">
              <svg viewBox="0 0 380 125" fill="none">
                <defs>
                  <pattern id="grid" width="19" height="19" patternUnits="userSpaceOnUse">
                    <path d="M 19 0 L 0 0 0 19" stroke="#deebe6" strokeWidth=".7" />
                  </pattern>
                </defs>
                <rect width="380" height="125" fill="url(#grid)" />
                <path d="M0 71H58L68 64L78 71H102L116 80L132 27L149 103L164 58L178 71H219L230 63L241 71H267L279 79L295 26L312 104L327 57L342 71H380" stroke="#277d6b" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="science-content">
              <span className="micro">DA PERGUNTA À EVIDÊNCIA</span>
              <h3>
                Mais clareza.<br />Uma leitura de cada vez.
              </h3>
              <p>
                Artigos, fontes e organização<br />em um só lugar.
              </p>
              <div className="science-bottom">
                <span>PubMed</span>
                <span className="source-pill">
                  Fonte original <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
          </div>
          <div className="floating-note">
            <span className="note-icon">
              <Bookmark size={18} />
            </span>
            <div>
              <strong>Sua biblioteca, com você</strong>
              <span>Salve o que vale reler.</span>
            </div>
            <Check size={16} />
          </div>
          <div className="vertical-label">EVIDÊNCIA · CONTEXTO · CONHECIMENTO</div>
        </div>
      </div>
    </section>
  );
}
