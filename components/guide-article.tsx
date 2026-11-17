"use client";

import { ArrowRight, BookOpen, Filter, Library, Search } from "lucide-react";

export function GuideArticle({ lang }: { lang: "pt" | "en" }) {
  const en = lang === "en";
  const home = en ? "/en" : "/pt";
  const library = en ? "/en/library" : "/pt/biblioteca";
  const searches = [
    { href: `${home}?search=1&q=heart+failure+SGLT2&specialty=cardiology#explorar`, term: "heart failure SGLT2", note: en ? "Cardiology, class and condition" : "Cardiologia, classe e condição" },
    { href: `${home}?search=1&q=metformin+prediabetes&specialty=endocrinology#explorar`, term: "metformin prediabetes", note: en ? "Endocrinology, drug and population" : "Endocrinologia, fármaco e população" },
    { href: `${home}?search=1&specialty=cardiology&type=systematic#explorar`, term: en ? "Cardiology · systematic review" : "Cardiologia · revisão sistemática", note: en ? "Specialty and study type, no free-text term" : "Especialidade e tipo de estudo, sem termo livre" },
  ];
  const pico = [
    { key: "P", title: en ? "Patient" : "Paciente", text: en ? "Adults with heart failure" : "Adultos com insuficiência cardíaca", tone: "p" },
    { key: "I", title: en ? "Intervention" : "Intervenção", text: "iSGLT2", tone: "i" },
    { key: "C", title: en ? "Comparison" : "Comparação", text: en ? "Placebo" : "Placebo", tone: "c" },
    { key: "O", title: en ? "Outcome" : "Desfecho", text: en ? "Hospitalization" : "Internação", tone: "o" },
  ];
  return (
    <main id="guia" className="guide-page container">
      <p className="eyebrow">{en ? "SEARCH GUIDE" : "GUIA DE BUSCA"}</p>
      <h1>{en ? "How to search without getting lost" : "Como buscar sem se perder"}</h1>
      <p className="guide-lead">{en
        ? "A short guide to the clinical question, PubMed filters and the library. It does not replace reading the original paper."
        : "Um guia curto para a pergunta clínica, os filtros do PubMed e a biblioteca. Não substitui a leitura do artigo original."}</p>

      <ol className="guide-steps">
        <li>
          <span>1</span>
          <div>
            <h2>{en ? "Write a simple PICO question" : "Formule a pergunta em PICO simples"}</h2>
            <p>{en ? "Four parts are enough. The example below is one sentence." : "Quatro partes bastam. O exemplo abaixo é uma frase só."}</p>
          </div>
        </li>
      </ol>

      <div className="pico-row" aria-label="PICO">
        {pico.map((block, index) => (
          <div className="pico-step" key={block.key}>
            <article className={`pico-card pico-${block.tone}`}>
              <strong>{block.key}</strong>
              <h3>{block.title}</h3>
              <p>{block.text}</p>
            </article>
            {index < pico.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
      <p className="pico-sentence">{en
        ? "In adults with heart failure, does an SGLT2 inhibitor, compared with placebo, reduce hospitalization?"
        : "Em adultos com insuficiência cardíaca, um iSGLT2, comparado a placebo, reduz internação?"}</p>

      <h2 className="guide-section-title">{en ? "How a search moves" : "Como a busca anda"}</h2>
      <ol className="guide-flow">
        <li><Search size={18} />{en ? "Question" : "Pergunta"}</li>
        <li><Filter size={18} />{en ? "Filters" : "Filtros"}</li>
        <li><BookOpen size={18} />{en ? "Results" : "Resultados"}</li>
        <li><Library size={18} />{en ? "Library" : "Biblioteca"}</li>
      </ol>

      <h2 className="guide-section-title">{en ? "Searches you can open" : "Buscas que você pode abrir"}</h2>
      <div className="guide-chips">
        {searches.map((item) => (
          <a key={item.href} href={item.href}>
            <strong>{item.term}</strong>
            <span>{item.note}</span>
          </a>
        ))}
      </div>

      <aside className="guide-callout">
        <h2>{en ? "English terms and MeSH" : "Termos em inglês e MeSH"}</h2>
        <p>{en
          ? "PubMed indexes titles, abstracts and MeSH headings in English. “Insuficiência cardíaca” is heart failure; “diabetes tipo 2” is type 2 diabetes. A drug name is often the same in both languages."
          : "O PubMed indexa título, resumo e descritores MeSH em inglês. “Insuficiência cardíaca” é heart failure; “diabetes tipo 2” é type 2 diabetes. O nome do fármaco costuma ser o mesmo."}</p>
      </aside>

      <aside className="guide-callout warn">
        <h2>{en ? "The label is not a grade" : "O rótulo não é uma nota"}</h2>
        <p>{en
          ? "Systematic review, meta-analysis, randomized trial and guideline are publication types. Read the population, the comparison and the outcome in the original record."
          : "Revisão sistemática, metanálise, ensaio randomizado e diretriz são tipos de publicação. Leia população, comparação e desfecho no registro original."}</p>
      </aside>

      <section className="guide-filters">
        <h2>{en ? "Filters that stay" : "Filtros que ficam"}</h2>
        <ul>
          <li>{en ? "Specialty, for example cardiology or endocrinology." : "Especialidade, por exemplo cardiologia ou endocrinologia."}</li>
          <li>{en ? "Study type: clinical trial, randomized trial, review, systematic review, meta-analysis or guideline." : "Tipo de estudo: ensaio clínico, ensaio randomizado, revisão, revisão sistemática, metanálise ou diretriz."}</li>
          <li>{en ? "Period: any date, 30 days, 12 months or 5 years." : "Período: qualquer data, 30 dias, 12 meses ou 5 anos."}</li>
        </ul>
        <a className="button" href={`${home}#explorar`}>{en ? "Open the article search" : "Abrir a busca de artigos"}</a>
      </section>

      <p className="guide-library-link"><a href={library}>{en ? "Open my library" : "Abrir minha biblioteca"}</a></p>
    </main>
  );
}
