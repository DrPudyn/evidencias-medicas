import assert from "node:assert/strict";
import test from "node:test";
import { pickWeeklyArticle, summaryFromAbstract, summaryKeepsSourceNumbers, weekKey } from "./weekly-article";

function hit(partial: { id: string; title: string; journal?: string; date?: string; type?: string; abstract?: string }) {
  return {
    journal: "Heart",
    date: "2026 Nov",
    authors: "",
    type: "Artigo científico",
    topic: "all",
    url: `https://pubmed.ncbi.nlm.nih.gov/${partial.id}/`,
    abstract: "OBJECTIVE: To test a drug. METHODS: Randomized trial of 1200 adults. RESULTS: Death fell from 12% to 8%. CONCLUSIONS: The drug reduced death.",
    ...partial,
  };
}

test("a semana usa a segunda-feira no fuso de São Paulo", () => {
  assert.equal(weekKey(new Date("2026-11-15T15:00:00Z")), "2026-11-09");
});

test("escolhe diretriz com resumo e ignora artigo sem abstract", () => {
  const chosen = pickWeeklyArticle([
    hit({ id: "30", title: "Trial", type: "Ensaio clínico randomizado", journal: "The Lancet" }),
    hit({ id: "20", title: "Empty", abstract: "" }),
    hit({ id: "10", title: "Guideline", type: "Diretriz", journal: "Circulation" }),
  ]);
  assert.equal(chosen?.id, "10");
});

test("o resumo não cria número que o abstract não tem", () => {
  const summary = summaryFromAbstract("RESULTS: Mortality was 8% versus 12%. CONCLUSIONS: Mortality was lower.");
  assert.match(summary, /8%/);
  assert.match(summary, /Não consta no resumo/);
  assert.equal(summaryKeepsSourceNumbers(summary, "Mortality was 8% versus 12%."), true);
  assert.equal(summaryKeepsSourceNumbers("O risco caiu 99%.", "Mortality was 8%."), false);
});
