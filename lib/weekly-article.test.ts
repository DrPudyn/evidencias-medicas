import assert from "node:assert/strict";
import test from "node:test";
import { structuredSections } from "./pubmed-xml";
import { acceptSectionTranslation, pickWeeklyArticle, renderWeeklySummary, sectionsToTranslate, summaryFromAbstract, summaryKeepsSourceNumbers, weekKey, weeklyParts, weeklySpecialtyQuery, WEEKLY_SECTION_PROMPT } from "./weekly-article";

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

test("rótulos de método, resultado e conclusão entram na seção certa", () => {
  const summary = summaryFromAbstract("BACKGROUND: Adults with diabetes. SEARCH METHODS: We searched MEDLINE. MAIN RESULTS: Death was 8%. AUTHORS' CONCLUSIONS: Treatment helped.");
  assert.match(summary, /Objetivo: Adults with diabetes/);
  assert.match(summary, /Método: We searched MEDLINE/);
  assert.match(summary, /Principais resultados: Death was 8%/);
  assert.match(summary, /Conclusão: Treatment helped/);
});

test("abstract sem seções usa a última frase como conclusão e o número como resultado", () => {
  const summary = summaryFromAbstract("This review assessed treatment in primary care. Mortality fell from 12% to 8%. The evidence supports offering the treatment.");
  assert.match(summary, /Conclusão: The evidence supports offering the treatment/);
  assert.match(summary, /Principais resultados: Mortality fell from 12% to 8%/);
  assert.doesNotMatch(summary, /Conclusão: Não consta/);
});

test("a aplicação prática fixa não entra no texto enviado à tradução", () => {
  const parts = weeklyParts([{ label: "", nlmCategory: "", text: "Exercise helped adolescents. The authors reported a benefit." }]);
  const sent = sectionsToTranslate(parts).map((section) => section.text).join(" ");
  assert.doesNotMatch(sent, /Aplicação prática|recomendação separada/);
  assert.match(renderWeeklySummary(parts), /Aplicação prática: Não consta no resumo como recomendação separada/);
});

test("uma seção recusada fica em inglês e as outras podem ficar em português", () => {
  const parts = weeklyParts([
    { label: "OBJECTIVE", nlmCategory: "OBJECTIVE", text: "To test a drug." },
    { label: "RESULTS", nlmCategory: "RESULTS", text: "Death was 8%." },
    { label: "CONCLUSIONS", nlmCategory: "CONCLUSIONS", text: "The drug reduced death." },
  ]);
  const summary = renderWeeklySummary(parts, {
    objective: "Testar um fármaco.",
    results: "A morte foi 99%.",
    conclusion: "Recomenda-se o fármaco.",
  });
  assert.match(summary, /Objetivo: Testar um fármaco/);
  assert.match(summary, /Principais resultados: Death was 8%/);
  assert.match(summary, /Conclusão: The drug reduced death/);
  assert.equal(acceptSectionTranslation("Death was 8%.", "A morte foi 99%."), false);
});

test("o pedido de tradução não inventa sigla", () => {
  assert.match(WEEKLY_SECTION_PROMPT, /Tai Chi Chuan/);
  assert.match(WEEKLY_SECTION_PROMPT, /não leia TCC como terapia cognitivo-comportamental/i);
});

test("43024818 não vira objetivo Resumo nem manda contexto para resultados", () => {
  const parts = weeklyParts(structuredSections(`<Abstract><AbstractText>Cardiac channelopathies are heterogeneous conditions. Historically, athletes with these conditions were excluded from participation. Many athletes may be supported in their decision to return to play.</AbstractText></Abstract>`));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Objetivo: Cardiac channelopathies are heterogeneous conditions. Historically/);
  assert.doesNotMatch(summary, /Objetivo: Resumo/);
  assert.match(summary, /Principais resultados: Não consta/);
  assert.match(summary, /Conclusão: Many athletes may be supported/);
  assert.match(summary, /Aplicação prática: Não consta no resumo como recomendação separada/);
});

test("42971815 deixa o método Delphi fora da conclusão", () => {
  const parts = weeklyParts(structuredSections(`<AbstractText>Continuous glucose monitoring is a key tool in primary care. This document formulates clinical practice recommendations. The recommendations are based on a Delphi involving 58 professionals. The integration of CGM can improve outcomes.</AbstractText>`));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Método: The recommendations are based on a Delphi/);
  assert.match(summary, /Conclusão: The integration of CGM can improve outcomes/);
  assert.doesNotMatch(summary, /Conclusão:.*Delphi/);
});

test("43034163 manda o achado da seleção para resultados", () => {
  const parts = weeklyParts(structuredSections(`
    <AbstractText Label="OBJECTIVES" NlmCategory="OBJECTIVE">To map the adverse events of semaglutide.</AbstractText>
    <AbstractText Label="SOURCES" NlmCategory="METHODS">A literature search was conducted in PubMed, Scopus, and Web of Science from 2019 until 2025.</AbstractText>
    <AbstractText Label="STUDY SELECTION" NlmCategory="METHODS">Of 630 identified records, 12 studies were included after screening. The review identified nausea (12 studies) and diarrhea (11 studies).</AbstractText>
    <AbstractText Label="CONCLUSIONS" NlmCategory="CONCLUSIONS">Semaglutide had a favorable safety profile.</AbstractText>
  `));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Método:.*from 2019 until 2025/);
  assert.match(summary, /Método:.*included after screening/);
  assert.doesNotMatch(summary, /Método:.*nausea/);
  assert.match(summary, /Principais resultados: The review identified nausea \(12 studies\)/);
});

test("42773989 descarta o bloco em chinês", () => {
  const parts = weeklyParts(structuredSections(`
    <AbstractText>Membranous nephropathy is common in China. The guideline gives evidence-based guidance.</AbstractText>
    <AbstractText>膜性肾病（MN）是我国常见的原发性肾小球疾病之一。</AbstractText>
  `));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Conclusão: The guideline gives evidence-based guidance/);
  assert.doesNotMatch(summary, /膜/);
});

test("42905121 não corta o método em SYNTHESIS OF", () => {
  const parts = weeklyParts(structuredSections(`
    <AbstractText Label="SEARCH METHODS" NlmCategory="METHODS">We searched CENTRAL and MEDLINE from January 1990 to October 2025.</AbstractText>
    <AbstractText Label="SYNTHESIS METHODS" NlmCategory="METHODS">We followed standard Cochrane methodology, and two independent review authors performed all steps in duplicate.</AbstractText>
    <AbstractText Label="SYNTHESIS OF RESULTS" NlmCategory="RESULTS">As we did not identify enough RCTs, we did not conduct a meta-analysis. AlloSCT may result in little to no difference in two-year overall survival (hazard ratio (HR) 1.3 (95% CI 0.7 to 2.4)).</AbstractText>
    <AbstractText Label="AUTHORS' CONCLUSIONS" NlmCategory="CONCLUSIONS">We identified low-certainty evidence.</AbstractText>
  `));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Método:.*in duplicate/);
  assert.doesNotMatch(summary, /Método:.*SYNTHESIS OF\s*$/m);
  assert.match(summary, /Principais resultados: As we did not identify enough RCTs/);
  assert.match(summary, /1\.3/);
  assert.match(summary, /Conclusão: We identified low-certainty evidence/);
});

test("43016480 mapeia rótulos sem categoria e guarda a sigla TCC", () => {
  const parts = weeklyParts(structuredSections(`
    <AbstractText Label="OBJECTIVE" NlmCategory="UNASSIGNED">This study aims to update evidence on exercise.</AbstractText>
    <AbstractText Label="METHODS" NlmCategory="UNASSIGNED">We searched six databases.</AbstractText>
    <AbstractText Label="RESULTS" NlmCategory="UNASSIGNED">Exercise improved depression (g = -0.34). Adolescents may benefit from low-intensity TCC exercises.</AbstractText>
    <AbstractText Label="CONCLUSION" NlmCategory="UNASSIGNED">Exercise plays a positive role.</AbstractText>
    <AbstractText Label="SYSTEMATIC REVIEW REGISTRATION" NlmCategory="UNASSIGNED">PROSPERO CRD420251087193.</AbstractText>
  `));
  const summary = renderWeeklySummary(parts);
  assert.match(summary, /Principais resultados:.*TCC/);
  assert.match(summary, /g = -0\.34|0\.34/);
  assert.doesNotMatch(summary, /PROSPERO|CRD420251087193/);
  assert.match(summary, /Aplicação prática: Não consta no resumo como recomendação separada/);
});

test("medicina de família usa descritores mais amplos", () => {
  assert.match(weeklySpecialtyQuery("family-medicine", "family medicine;primary health care"), /Family Practice/);
  assert.match(weeklySpecialtyQuery("family-medicine", "family medicine;primary health care"), /Primary Health Care/);
});

test("o resumo não cria número que o abstract não tem", () => {
  const summary = summaryFromAbstract("RESULTS: Mortality was 8% versus 12%. CONCLUSIONS: Mortality was lower.");
  assert.match(summary, /8%/);
  assert.match(summary, /Não consta no resumo/);
  assert.equal(summaryKeepsSourceNumbers(summary, "Mortality was 8% versus 12%."), true);
  assert.equal(summaryKeepsSourceNumbers("O risco caiu 99%.", "Mortality was 8%."), false);
});
