"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { ClinicalAnswer } from "@/lib/clinical/types";

function AnswerText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  function flush(key: string) {
    if (!items.length) return;
    const list = items;
    items = [];
    blocks.push(
      <ul className="answer-list" key={key}>
        {list.map((item, index) => <li key={`${key}-${index}`}>{item.replace(/^[-•]\s+/, "")}</li>)}
      </ul>,
    );
  }
  lines.forEach((line, index) => {
    if (/^[-•]\s+/.test(line)) {
      items.push(line);
      return;
    }
    flush(`list-${index}`);
    blocks.push(<p className="answer-conclusion" key={`p-${index}`}>{line}</p>);
  });
  flush("list-end");
  return <>{blocks}</>;
}

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
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<ClinicalAnswer | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 12 || pending) return;
    setPending(true);
    setStage("pubmed");
    setError("");
    setAnswer(null);
    try {
      const response = await fetch("/api/clinical-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("ndjson")) {
        const data = await response.json() as { error?: string; answer?: ClinicalAnswer };
        if (!response.ok || !data.answer) {
          setError(data.error || t("Não foi possível responder agora."));
          return;
        }
        setAnswer(data.answer);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        setError(t("Não foi possível responder agora."));
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      let finalAnswer: ClinicalAnswer | null = null;
      let streamError = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { stage?: string; answer?: ClinicalAnswer; error?: string };
          if (event.error) streamError = event.error;
          else if (event.stage === "done" && event.answer) finalAnswer = event.answer;
          else if (event.stage) setStage(event.stage);
        }
      }
      if (streamError || !finalAnswer) {
        setError(streamError || t("Não foi possível responder agora."));
        return;
      }
      setAnswer(finalAnswer);
    } catch {
      setError(t("Não foi possível responder agora."));
    } finally {
      setPending(false);
      setStage("");
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
              {pending ? t(stage === "writing" ? "Escrevendo resposta…" : stage === "reading" ? "Lendo artigos…" : "Buscando no PubMed…") : t("Perguntar")}
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
            <h2>{t(stage === "writing" ? "Escrevendo resposta…" : stage === "reading" ? "Lendo artigos…" : "Buscando no PubMed…")}</h2>
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
            <AnswerText text={answer.answer} />
            {answer.references.length > 0 && (
              <ol className="reference-list">
                {answer.references.map((item) => (
                  <li key={item.pmid} value={item.n}>
                    <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                    {item.type ? <small>{item.type}</small> : null}
                  </li>
                ))}
              </ol>
            )}
            <p className="disclaimer">{t(answer.disclaimer)}</p>
          </article>
        )}
      </div>
    </>
  );
}
