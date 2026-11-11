"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { ClinicalAnswer } from "@/lib/clinical/types";

type Quota = { plan: string; limit: number; used: number; remaining: number };

const levelLabel: Record<ClinicalAnswer["level"], string> = {
  alto: "Nível alto",
  moderado: "Nível moderado",
  baixo: "Nível baixo",
  insuficiente: "Evidência insuficiente",
};

export function ClinicalQuestion({
  q,
  onQueryChange,
  onSearch,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  onSearch: (event?: FormEvent) => void;
}) {
  const { t } = useLocale();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<ClinicalAnswer | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 12 || pending) return;
    setPending(true);
    setError("");
    setAnswer(null);
    try {
      const response = await fetch("/api/clinical-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json() as { error?: string; answer?: ClinicalAnswer; quota?: Quota };
      if (!response.ok || !data.answer) {
        setError(data.error || t("Não foi possível responder agora."));
        return;
      }
      setAnswer(data.answer);
      if (data.quota) setQuota(data.quota);
    } catch {
      setError(t("Não foi possível responder agora."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" />{t("PERGUNTA CLÍNICA")}</p>
        <h1 className="headline">
          <span>{t("A pergunta clínica,")}</span>
          <em>{t("com a literatura ao lado.")}</em>
        </h1>
        <p className="lede">{t("Escreva em português. Buscamos revisões sistemáticas, metanálises e diretrizes no PubMed e resumimos só o que esses registros dizem.")}</p>
        <form className="clinical-form" onSubmit={(event) => void ask(event)}>
          <label htmlFor="clinical-question">{t("Faça sua pergunta clínica em português")}</label>
          <textarea
            id="clinical-question"
            name="question"
            required
            minLength={12}
            maxLength={500}
            rows={4}
            value={question}
            placeholder={t("Faça sua pergunta clínica em português")}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="clinical-form-row">
            <span>{question.trim().length}/500</span>
            <button className="button" type="submit" disabled={pending || question.trim().length < 12}>
              {pending ? t("Buscando a literatura…") : t("Perguntar")}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
        <p className="disclaimer">{t("A resposta não substitui o julgamento clínico. Se a busca vier vazia ou a evidência não bastar, isso é dito com clareza.")}</p>
        <form className="hero-search pubmed-search" onSubmit={onSearch}>
          <Search size={18} />
          <input
            aria-label={t("Buscar artigos no PubMed por título, resumo e descritores")}
            placeholder={t("Ou busque direto no PubMed")}
            value={q}
            onChange={(event) => onQueryChange(event.target.value)}
            maxLength={200}
          />
          <button className="button secondary" type="submit">{t("Buscar")}</button>
        </form>
        <p className="search-hint">{t("A busca direta considera título, resumo e MeSH. A pergunta clínica, acima, restringe a revisões sistemáticas, metanálises e diretrizes.")}</p>
        <p className="hero-trust">
          <a href="#planos">{t("Ver planos")}</a>
          <span>{t("Fontes científicas identificadas")}</span>
        </p>
      </div>
      <div className="clinical-stage" aria-live="polite">
        {pending && (
          <article className="glass-card answer-card">
            <p className="eyebrow">{t("EM CURSO")}</p>
            <h2>{t("Consultando o PubMed")}</h2>
            <p>{t("A busca e o resumo usam só os registros recuperados. Pode levar até um minuto.")}</p>
          </article>
        )}
        {error && !pending && <p className="form-error" role="alert">{error}</p>}
        {!pending && !error && !answer && (
          <article className="glass-card answer-card quiet-card">
            <p className="eyebrow">{t("O QUE ENTRA NA RESPOSTA")}</p>
            <h2>{t("Nada além do que a busca trouxer.")}</h2>
            <ul>
              <li>{t("Termos de busca em inglês, depois o filtro de revisão, metanálise e diretriz.")}</li>
              <li>{t("Cada afirmação fica ligada ao PMID recuperado.")}</li>
              <li>{t("Sem estatística de marketing e sem depoimento.")}</li>
            </ul>
          </article>
        )}
        {answer && !pending && (
          <article className="glass-card answer-card">
            <p className="eyebrow">{t(levelLabel[answer.level])}</p>
            <h2>{answer.sufficient ? t("Síntese desta busca") : t("Sem conclusão desta busca")}</h2>
            <p className="answer-conclusion">{answer.conclusion}</p>
            <p className="level-reason">{answer.levelReason}</p>
            {answer.claims.length > 0 && (
              <ul className="claim-list">
                {answer.claims.map((claim) => (
                  <li key={claim.text}>
                    <p>{claim.text}</p>
                    <span>{claim.pmids.map((pmid) => `PMID ${pmid}`).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
            {answer.limitations.length > 0 && (
              <div className="answer-block">
                <h3>{t("Limitações")}</h3>
                <ul>{answer.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
            {answer.references.length > 0 && (
              <div className="answer-block">
                <h3>{t("Referências citadas")}</h3>
                <ol className="reference-list">
                  {answer.references.map((item) => (
                    <li key={item.pmid}>
                      <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      <small>{item.type} · {item.journal} · {item.date} · PMID {item.pmid}{item.doi ? ` · DOI ${item.doi}` : ""}</small>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {!answer.sufficient && answer.retrieved.length > 0 && (
              <div className="answer-block">
                <h3>{t("Registros recuperados, sem conclusão")}</h3>
                <ol className="reference-list">
                  {answer.retrieved.map((item) => (
                    <li key={item.pmid}>
                      <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      <small>PMID {item.pmid}</small>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {answer.discardedCitations.length > 0 && (
              <p className="discarded">{t("Citações fora da busca foram descartadas:")} {answer.discardedCitations.join(", ")}</p>
            )}
            <p className="disclaimer">{t(answer.disclaimer)}</p>
            {quota && <p className="quota-note">{t("Uso de hoje")}: {quota.used}/{quota.limit}</p>}
          </article>
        )}
      </div>
    </>
  );
}
