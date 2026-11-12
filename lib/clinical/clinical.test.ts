import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { answerClinicalQuestion } from "./answer";
import { validateSynthesis } from "./validate";
import { focusAbstract, highLevelPmids } from "../pubmed-xml";
import { SUMMARY_SYSTEM, summaryUser } from "./prompts";
import { mentionsConcept, mergeIndicationRecords, selectForSynthesis } from "./select";
import { conceptsForQuestion, conditionsFromGuideline, evidenceQuery, fallbackSearchTerms, queryForKind, sanitizeConcepts, searchAttempts } from "./terms";
import { createClinicalAi, createWorkersAi } from "./provider";
import { quotaMessage, releaseClinicalQuota, reserveClinicalQuota } from "./quota";
import type { ClinicalAi, EvidenceRecord } from "./types";

const record = (pmid: string, type = "Meta-análise", about = "diabetes"): EvidenceRecord => ({
  pmid,
  title: `${about} ${pmid}`,
  journal: "Journal",
  date: "2024",
  authors: "Alguém",
  type,
  doi: `10.1000/test.${pmid}`,
  url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  abstract: `${about}. Resumo recuperado do PMID ${pmid}. Redução relatada no abstract.`,
});

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE subscriptions (
      user_id text PRIMARY KEY,
      plan text NOT NULL,
      status text NOT NULL,
      stripe_customer_id text,
      stripe_subscription_id text,
      current_period_end integer,
      updated_at integer NOT NULL
    );
    CREATE TABLE clinical_quota (
      subject_key text NOT NULL,
      day text NOT NULL,
      count integer NOT NULL,
      PRIMARY KEY (subject_key, day)
    );
  `);
  return {
    prepare(sql: string) {
      const statement = db.prepare(sql);
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              const row = statement.get(...(params as never[])) as T | undefined;
              return row ?? null;
            },
            async run() {
              const info = statement.run(...(params as never[]));
              return { meta: { changes: Number(info.changes) } };
            },
          };
        },
      };
    },
  };
}

test("termos de reserva não misturam sobras em português", () => {
  assert.deepEqual(fallbackSearchTerms("A metformina reduz complicações no diabetes tipo 2?").sort(), ["metformin", "type 2 diabetes"]);
});

test("termos genéricos saem e sinônimos com OR ficam no mesmo conceito", () => {
  assert.deepEqual(sanitizeConcepts({
    terms: ["sGLT2 inhibitors OR gliflozins", "primary care", "family medicine", "indications", "use", "healthcare"],
  }), [
    ["sglt2 inhibitors", "gliflozins"],
    ["primary care"],
    ["family medicine"],
  ]);
});

test("busca vazia refaz a consulta só com o conceito principal", async () => {
  const seen: string[] = [];
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({
        concepts: [["SGLT2 inhibitors", "gliflozin"], ["primary care"], ["family medicine"]],
      });
    },
    async summarize() {
      return JSON.stringify({
        sufficient: true,
        answer: "As indicações descritas estão nos artigos citados [1].",
        citations: ["12345678"],
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "Quais as indicações de uso de iSGLT2 na prática de saúde da família?",
    ai,
    search: async (term) => {
      seen.push(term);
      return /primary care|family medicine/i.test(term) ? [] : [record("12345678", "Meta-análise", "sglt2 inhibitors")];
    },
  });
  assert.equal(answer.sufficient, true);
  assert.ok(seen.some((term) => /sglt2 inhibitors/i.test(term) && !/primary care|family medicine/i.test(term)));
  const attempts = searchAttempts([["sglt2 inhibitors"], ["primary care"]], "2026/11/11");
  assert.equal(attempts.length, 3);
  assert.doesNotMatch(attempts[2], /1900\/01\/01/);
});

test("fallback tira o contexto antes e prova o par clínico antes do conceito único", async () => {
  const seen: string[] = [];
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({
        concepts: [["sglt2 inhibitors"], ["family practice"], ["type 2 diabetes"]],
      });
    },
    async summarize() {
      return JSON.stringify({
        sufficient: true,
        answer: "No diabetes tipo 2, a indicação citada está no artigo [1].",
        citations: ["99999999"],
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "Quais as indicações de iSGLT2 no diabetes tipo 2, na prática de saúde da família?",
    ai,
    search: async (term) => {
      seen.push(term);
      const hasFamily = /family practice/i.test(term);
      const hasDiabetes = /type 2 diabetes/i.test(term);
      const hasSglt = /sglt2/i.test(term);
      return !hasFamily && hasSglt && hasDiabetes
        ? [record("12345678", "Diretriz", "sglt2 inhibitors type 2 diabetes")]
        : [];
    },
  });
  assert.equal(answer.sufficient, true);
  assert.ok(seen.some((term) => /sglt2/i.test(term) && /type 2 diabetes/i.test(term) && !/family practice/i.test(term)));
  assert.equal(answer.references[0]?.pmid, "12345678");
});

test("fármaco é buscado com cada condição clínica e os resultados se unem", async () => {
  const seen: string[] = [];
  let sentToSummary: string[] = [];
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({
        concepts: [["sglt2 inhibitors"], ["heart failure"], ["type 2 diabetes"], ["family practice"]],
      });
    },
    async summarize(_question, records) {
      sentToSummary = records.map((item) => item.pmid);
      return JSON.stringify({
        sufficient: true,
        answer: "- Menos hospitalização por insuficiência cardíaca [1].\n- Menos eventos no diabetes [2].",
        citations: [],
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "Quais as indicações de sglt2 na insuficiência cardíaca e no diabetes tipo 2?",
    ai,
    search: async (term) => {
      seen.push(term);
      if (/heart failure/i.test(term)) return [record("10", "Diretriz", "sglt2 heart failure hospitalization")];
      if (/type 2 diabetes/i.test(term)) return [record("20", "Revisão sistemática", "sglt2 type 2 diabetes events")];
      return [];
    },
  });
  assert.equal(seen.filter((term) => /heart failure/i.test(term) && /sglt2/i.test(term)).length, 1);
  assert.equal(seen.filter((term) => /type 2 diabetes/i.test(term) && /sglt2/i.test(term)).length, 1);
  assert.deepEqual(sentToSummary, ["10", "20"]);
  assert.equal(answer.sufficient, true);
  assert.deepEqual(answer.references.map((item) => item.pmid), ["10", "20"]);
});

test("consultas de cada condição saem juntas, sem esperar a anterior", async () => {
  let open = 0;
  let maxOpen = 0;
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ concepts: [["sglt2 inhibitors"], ["heart failure"], ["type 2 diabetes"]] });
    },
    async summarize() {
      return JSON.stringify({ sufficient: false, answer: "", citations: [] });
    },
  };
  await answerClinicalQuestion({
    question: "indicações de sglt2 na insuficiência cardíaca e no diabetes tipo 2",
    ai,
    search: async () => {
      open += 1;
      maxOpen = Math.max(maxOpen, open);
      await new Promise((resolve) => setTimeout(resolve, 40));
      open -= 1;
      return [];
    },
  });
  assert.ok(maxOpen >= 2);
});

test("a síntese recebe um trecho curto e o aviso de cookies sai do rodapé", () => {
  const article = record("1", "Diretriz", "sglt2");
  article.abstract = `CONCLUSIONS: ${"palavra ".repeat(800)}`;
  const packed = summaryUser("indicações", [article]);
  const excerpt = (JSON.parse(packed.slice(packed.indexOf("[{"))) as Array<{ excerpt: string }>)[0].excerpt;
  assert.ok(excerpt.length <= 420);
  assert.ok(excerpt.length < article.abstract.length);
  const css = readFileSync(new URL("../../app/premium.css", import.meta.url), "utf8");
  const rule = css.slice(css.indexOf(".analytics-consent {"), css.indexOf(".analytics-consent p"));
  assert.match(rule, /position:\s*static/);
});

test("efetch descarta caso-controle e mantém revisão sistemática", () => {
  const xml = `
    <PubmedArticle><MedlineCitation><PMID>35100355</PMID>
      <Article><PublicationTypeList>
        <PublicationType>Journal Article</PublicationType>
        <PublicationType>Case-Control Studies</PublicationType>
      </PublicationTypeList></Article>
    </MedlineCitation></PubmedArticle>
    <PubmedArticle><MedlineCitation><PMID>11111111</PMID>
      <Article><PublicationTypeList>
        <PublicationType>Systematic Review</PublicationType>
        <PublicationType>Journal Article</PublicationType>
      </PublicationTypeList></Article>
    </MedlineCitation></PubmedArticle>
    <PubmedArticle><MedlineCitation><PMID>22222222</PMID>
      <Article><PublicationTypeList>
        <PublicationType>Practice Guideline</PublicationType>
      </PublicationTypeList></Article>
    </MedlineCitation></PubmedArticle>`;
  assert.deepEqual(highLevelPmids(xml), ["11111111", "22222222"]);
});

test("pergunta clínica normal cita só PMIDs recuperados", async () => {
  const records = [record("12345678", "Revisão sistemática"), record("87654321", "Revisão sistemática")];
  let summaries = 0;
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ terms: ["type 2 diabetes", "metformin"] });
    },
    async summarize() {
      summaries += 1;
      return JSON.stringify({
        sufficient: true,
        answer: "As revisões recuperadas descrevem redução de eventos com metformina [1] [2].",
        citations: ["12345678", "87654321"],
      });
    },
  };
  const seen: string[] = [];
  const answer = await answerClinicalQuestion({
    question: "Metformina no diabetes tipo 2 reduz eventos?",
    ai,
    search: async (term) => {
      seen.push(term);
      return records;
    },
  });
  assert.equal(summaries, 1);
  assert.match(seen[0], /type 2 diabetes/);
  assert.match(seen[0], /systematic\[sb\]/);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /\[1\].*\[2\]/);
  assert.deepEqual(answer.references.map((item) => item.pmid), ["12345678", "87654321"]);
  assert.deepEqual(answer.references.map((item) => item.n), [1, 2]);
  assert.equal(answer.references[0].url, "https://pubmed.ncbi.nlm.nih.gov/12345678/");
  assert.equal("journal" in answer.references[0], false);
  assert.equal(answer.discardedCitations.length, 0);
  assert.match(answer.disclaimer, /não substitui o julgamento clínico/i);
});

test("busca vazia não pede síntese nem completa com conhecimento geral", async () => {
  let summaries = 0;
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ terms: ["rare invented topic"] });
    },
    async summarize() {
      summaries += 1;
      return JSON.stringify({ sufficient: true, conclusion: "Trate com o fármaco X.", claims: [] });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "Existe diretriz para este tema raro?",
    ai,
    search: async () => [],
  });
  assert.equal(summaries, 0);
  assert.equal(answer.sufficient, false);
  assert.match(answer.answer, /Não encontramos/);
  assert.equal(answer.references.length, 0);
  assert.doesNotMatch(answer.answer, /fármaco X|Trate/);
});

test("PMID inventado pela IA é descartado e não vira conclusão", async () => {
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ terms: ["heart failure"] });
    },
    async summarize() {
      return JSON.stringify({
        sufficient: true,
        answer: "Conduta geral baseada no PMID 99999999 [1]. Sempre interne.",
        citations: ["99999999"],
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "Como conduzir insuficiência cardíaca?",
    ai,
    search: async () => [record("12345678", "Meta-análise", "heart failure")],
  });
  assert.equal(answer.sufficient, false);
  assert.equal(answer.references.length, 0);
  assert.ok(answer.discardedCitations.includes("99999999"));
  assert.match(answer.answer, /Nenhuma conclusão/);
  assert.doesNotMatch(answer.answer, /sempre interne|Conduta geral|99999999/);
});

test("número da frase aponta para o artigo enviado, não para a ordem do array citations", () => {
  const sent = [
    record("11111111", "Revisão sistemática", "sglt2"),
    record("22222222", "Meta-análise", "sglt2"),
    record("33333333", "Revisão sistemática", "sglt2"),
    record("44444444", "Diretriz", "sglt2"),
  ];
  const answer = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "Na insuficiência cardíaca, a diretriz cita o uso [4].\nNo diabetes tipo 2, a metanálise descreve o benefício [2].\nConduta inventada [9].",
    citations: ["11111111", "33333333"],
  }), sent);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /insuficiência cardíaca[\s\S]*\[1\]/);
  assert.match(answer.answer, /diabetes tipo 2[\s\S]*\[2\]/);
  assert.doesNotMatch(answer.answer, /inventada|\[9\]|\[4\]/);
  assert.deepEqual(answer.references.map((item) => item.pmid), ["44444444", "22222222"]);
});

test("seleção prioriza diretriz e revisão recente e descarta artigo fora do tema", () => {
  const papers = [
    { ...record("10000001", "Revisão sistemática", "sglt2 inhibitors"), date: "2024 Jan" },
    { ...record("10000002", "Diretriz", "sglt2 inhibitors"), date: "2020" },
    { ...record("10000003", "Meta-análise", "sglt2 inhibitors"), date: "2023 Jun" },
    { ...record("10000004", "Revisão sistemática", "vitamin b12 metformin"), date: "2024" },
    { ...record("10000005", "Diretriz", "sglt2 inhibitors"), date: "2022 Mar" },
  ];
  const selected = selectForSynthesis(papers, ["sglt2 inhibitors"], 8);
  assert.deepEqual(selected.map((item) => item.pmid), ["10000005", "10000001", "10000003", "10000002"]);
  assert.equal(mentionsConcept({
    title: "SGLT2 inhibitors and kidney outcomes",
    abstract: "Gliflozin reduced hospitalization.",
  }, ["Sodium-Glucose Transporter 2 Inhibitors"]), true);
  const unmatched = selectForSynthesis([
    record("9", "Revisão sistemática", "unrelated vitamin trial"),
  ], ["zzzzuniqueclass"]);
  assert.equal(unmatched.length, 1);
  const indication = selectForSynthesis([
    record("7", "Revisão sistemática", "Bone safety of sglt2 inhibitors"),
    record("8", "Revisão sistemática", "Combination of sglt2 inhibitors and GLP-1"),
    record("6", "Diretriz", "sglt2 inhibitors heart failure"),
  ], ["sglt2 inhibitors"], 8, "Quais as indicações de sglt2?");
  assert.deepEqual(indication.map((item) => item.pmid), ["6"]);
  const tied = selectForSynthesis([
    { ...record("30", "Revisão sistemática", "sglt2 inhibitors"), date: "2024" },
    { ...record("10", "Revisão sistemática", "sglt2 inhibitors"), date: "2024" },
  ], ["sglt2 inhibitors"]);
  assert.deepEqual(tied.map((item) => item.pmid), ["10", "30"]);
  assert.equal(selectForSynthesis([
    record("10000006", "Revisão sistemática", "Empagliflozin in heart failure"),
  ], ["sglt2 inhibitors"]).length, 1);
});

test("o trecho enviado prioriza conclusão e resultados", () => {
  const background = `BACKGROUND: ${"método ".repeat(400)}`;
  const structured = `${background}\nRESULTS: reduziu hospitalização.\nCONCLUSIONS: menos internações por insuficiência cardíaca.`;
  const excerpt = focusAbstract(structured, 500);
  assert.match(excerpt, /CONCLUSIONS: menos internações/);
  assert.match(excerpt, /RESULTS: reduziu hospitalização/);
  assert.doesNotMatch(excerpt, /método método/);
  const packed = summaryUser("Pergunta clínica de teste?", [{
    ...record("1", "Revisão sistemática", "sglt2"),
    abstract: structured,
  }]);
  assert.match(packed, /menos internações por insuficiência cardíaca/);
  assert.doesNotMatch(packed, /método método/);
});

test("pergunta de indicação sem doença não inventa condições", async () => {
  const seen: string[] = [];
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({
        concepts: [["sglt2 inhibitors"], ["heart failure"], ["type 2 diabetes"], ["family practice"]],
      });
    },
    async summarize() {
      return JSON.stringify({
        sufficient: true,
        answer: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca [1].",
        citations: [],
      });
    },
  };
  await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    ai,
    search: async (term) => {
      seen.push(term);
      return /heart failure|type 2 diabetes/i.test(term) ? [] : [record("55", "Diretriz", "sglt2 inhibitors")];
    },
  });
  assert.equal(seen.some((term) => /heart failure|type 2 diabetes/i.test(term)), false);
  assert.match(seen[0], /sglt2 inhibitors/);
});

test("benefício de outro fármaco na mesma revisão é rejeitado", () => {
  const article = record("42586458", "Revisão sistemática", "sglt2");
  article.abstract = "Semaglutide reduced hospitalization for heart failure. SGLT2 inhibitors were mentioned as background therapy.";
  const answer = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca [1].",
    citations: ["42586458"],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, false);
  assert.doesNotMatch(answer.answer, /hospitalização/);
});

test("benefício fica quando a mesma frase do resumo cita a classe", () => {
  const article = record("77", "Diretriz", "sglt2");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure with low certainty.";
  const rejected = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca [1].",
    citations: [],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(rejected.sufficient, true);
  assert.match(rejected.answer, /certeza limitada/);
  const kept = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca, com certeza baixa [1].",
    citations: [],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /certeza baixa/);
});

test("desfecho em inglês é rejeitado", () => {
  const article = record("88", "Revisão sistemática", "sglt2");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  const answer = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "SGLT2 inhibitors reduced hospitalization for heart failure [1].",
    citations: [],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, false);
});

test("pmid solto e JSON de itens viram o número da citação", () => {
  const article = record("42426564", "Diretriz", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  const loose = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca (/pmid:42426564).",
    citations: [],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(loose.sufficient, true);
  assert.match(loose.answer, /\[1\]/);
  assert.equal(loose.references[0]?.pmid, "42426564");
  const structured = validateSynthesis(JSON.stringify({
    itens: [{
      texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca",
      pmid: "PMID 42426564",
    }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(structured.sufficient, true);
  assert.match(structured.answer, /\[1\]/);
  assert.doesNotMatch(structured.answer, /pmid/i);
});

test("citação inválida gera uma única nova tentativa", async () => {
  const prompts: string[] = [];
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ concepts: [["sglt2 inhibitors"]] });
    },
    async summarize(question) {
      prompts.push(question);
      if (prompts.length === 1) return JSON.stringify({ itens: [{ texto: "Texto sem artigo", pmid: "/pmid:99999999" }] });
      return JSON.stringify({
        itens: [{
          texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca",
          pmid: "42426564",
        }],
      });
    },
  };
  const article = record("42426564", "Diretriz", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  const answer = await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    ai,
    search: async () => [article],
  });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /inválida/);
  assert.match(prompts[1], /42426564/);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /\[1\]/);
});

test("certeza que o trecho não traz é removida", () => {
  const article = record("70", "Revisão sistemática", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  const answer = validateSynthesis(JSON.stringify({
    itens: [{
      texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca, com certeza alta.",
      pmid: "70",
    }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.doesNotMatch(answer.answer, /certeza/);
  assert.match(answer.answer, /hospitalização/);
});

test("condição fora da pergunta sai até quando vem no mesmo conceito", () => {
  assert.deepEqual(conceptsForQuestion(
    [["sglt2 inhibitors", "type 2 diabetes"], ["heart failure"], ["diabetes mellitus, type 2"]],
    "quais indicações de uso de sglt2 na prática de saúde da família",
  ), [["sglt2 inhibitors"]]);
  assert.deepEqual(conceptsForQuestion(
    [["diabetes mellitus, type 2"], ["sglt2 inhibitors"]],
    "quais indicações de uso de sglt2",
  ), [["sglt2 inhibitors"]]);
});

test("menção de passagem não entra e achado de um fármaco não vira a classe", () => {
  const iga = record("42584021", "Revisão sistemática", "IgA");
  iga.title = "IgA nephropathy: a systematic review";
  iga.abstract = "BACKGROUND: SGLT2 inhibitors are used in diabetic kidney disease.\nCONCLUSIONS: Immune complexes drive IgA nephropathy.";
  const onTopic = record("6", "Diretriz", "sglt2 inhibitors heart failure");
  const selected = selectForSynthesis([iga, onTopic], ["sglt2 inhibitors"], 8, "Quais as indicações de sglt2?");
  assert.deepEqual(selected.map((item) => item.pmid), ["6"]);
  const anemia = record("80", "Revisão sistemática", "anemia");
  anemia.title = "Anemia in type 2 diabetes";
  anemia.abstract = "CONCLUSIONS: Dapagliflozin improved anemia.";
  const answer = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 melhoraram a anemia.", pmid: "80" }],
  }), [anemia], ["sglt2 inhibitors"]);
  assert.match(answer.answer, /dapagliflozina/);
  assert.doesNotMatch(answer.answer, /inibidores de SGLT2/i);
});

test("diretriz recuperada abre a condição que ela cita e ocupa a síntese", async () => {
  const seen: Array<{ term: string; kind?: string; sort?: string }> = [];
  const guideline = record("11", "Diretriz", "sglt2");
  guideline.title = "SGLT2 inhibitors in heart failure";
  guideline.abstract = "CONCLUSIONS: Use SGLT2 inhibitors in heart failure.";
  const review = record("12", "Revisão sistemática", "sglt2 heart failure");
  review.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ concepts: [["sglt2 inhibitors"]] });
    },
    async summarize(_question, records) {
      return JSON.stringify({
        itens: records.slice(0, 1).map((record) => ({
          texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca",
          pmid: record.pmid,
        })),
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    ai,
    search: async (term, options) => {
      seen.push({ term, kind: options?.kind, sort: options?.sort });
      if (options?.kind === "guideline") return [guideline];
      if (/heart failure/i.test(term)) return [review];
      return [];
    },
  });
  assert.ok(seen.filter((item) => item.kind === "guideline" && item.sort === "relevance").length >= 1);
  assert.ok(seen.some((item) => /heart failure/i.test(item.term) && /HFrEF|reduced ejection/i.test(item.term)));
  assert.equal(seen.filter((item) => item.kind === "meta" && item.sort === "relevance").length, 1);
  assert.equal(seen.some((item) => /heart failure/i.test(item.term) && /sglt2/i.test(item.term)), true);
  assert.equal(answer.sufficient, true);
  assert.ok(answer.references.some((item) => item.pmid === "11"));
  const merged = mergeIndicationRecords({
    guidelines: [guideline, record("13", "Diretriz", "sglt2 inhibitors kidney")],
    metas: [record("14", "Meta-análise", "sglt2 inhibitors mortality")],
    recent: Array.from({ length: 7 }, (_, index) => record(String(20 + index), "Revisão sistemática", "sglt2 inhibitors outcome")),
    supplemental: [review],
    concept: ["sglt2 inhibitors"],
    question: "indicações de sglt2",
    limit: 6,
  });
  assert.equal(merged.length, 6);
  assert.equal(merged[0].pmid, "11");
  assert.equal(merged[1].pmid, "14");
  assert.equal(conditionsFromGuideline(guideline, "indicações de sglt2")[0], "heart failure");
  const term = queryForKind('("sglt2 inhibitors"[Title/Abstract]) AND (systematic[sb] OR "Meta-Analysis"[Publication Type] OR "Practice Guideline"[Publication Type] OR "Guideline"[Publication Type])', "guideline");
  assert.match(term, /Practice Guideline/);
  assert.doesNotMatch(term, /systematic\[sb\]/);
});

test("literatura veterinária sai da busca e da seleção", () => {
  const queries = [
    evidenceQuery([["sglt2 inhibitors"]], "2026/11/12"),
    evidenceQuery([["metformin"], ["prediabetic state"]], "2026/11/12"),
    ...searchAttempts([["sglt2 inhibitors"], ["primary care"]], "2026/11/12"),
    ...searchAttempts([["metformin"], ["prediabetic state"], ["diabetes mellitus type 2"]], "2026/11/12", "Metformina no pré-diabetes"),
    queryForKind(evidenceQuery([["sglt2 inhibitors"]], "2026/11/12"), "guideline"),
    queryForKind(evidenceQuery([["sglt2 inhibitors"], ["adverse effects", "perioperative"]], "2026/11/12"), "high-level"),
  ];
  for (const query of queries) {
    assert.equal(query.includes("AND NOT"), false, query);
    assert.match(query, / NOT \(animals\[mh\] NOT humans\[mh\]\)/);
  }
  const cats = record("42014100", "Diretriz", "sglt2");
  cats.title = "AAHA Diabetes Management Guidelines for Cats";
  cats.abstract = "CONCLUSIONS: SGLT2 inhibitors in feline diabetes.";
  const rodent = record("22", "Revisão sistemática", "sglt2 inhibitors");
  rodent.title = "SGLT2 inhibitors in a rodent animal model";
  const murine = record("23", "Revisão sistemática", "sglt2 inhibitors in mice");
  murine.title = "Experimental murine study of SGLT2 inhibitors";
  const human = record("21", "Diretriz", "sglt2 inhibitors in adults");
  const selected = selectForSynthesis([cats, rodent, murine, human], ["sglt2 inhibitors"], 6, "indicações de sglt2");
  assert.deepEqual(selected.map((item) => item.pmid), ["21"]);
});

test("pré-diabetes não puxa diabetes tipo 2 e o fallback tira esse conceito antes do fármaco só", () => {
  const question = "Metformina no pré-diabetes";
  const scoped = conceptsForQuestion(sanitizeConcepts({
    concepts: [["Metformin"], ["Prediabetic State"], ["Diabetes Mellitus, Type 2"]],
  }), question);
  assert.deepEqual(scoped, [["metformin"], ["prediabetic state"]]);
  const attempts = searchAttempts(
    [["metformin"], ["prediabetic state"], ["diabetes mellitus type 2"]],
    "2026/11/12",
    question,
  );
  assert.match(attempts[0], /metformin/);
  assert.match(attempts[0], /prediabetic state/);
  assert.match(attempts[0], /diabetes mellitus type 2/);
  const withoutDiabetes = attempts.findIndex((term) => /metformin/.test(term) && /prediabetic state/.test(term) && !/diabetes mellitus type 2/.test(term));
  const drugOnly = attempts.findIndex((term) => /metformin/.test(term) && !/prediabetic/.test(term) && !/diabetes mellitus/.test(term));
  assert.ok(withoutDiabetes > 0);
  assert.ok(drugOnly > withoutDiabetes);
  assert.equal(attempts.some((term) => term.includes("AND NOT")), false);
});

test("certeza limitada e interpretação cautelosa exigem ressalva", () => {
  const article = record("71", "Diretriz", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure with limited certainty and the result should be interpreted cautiously.";
  const missing = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca.", pmid: "71" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(missing.sufficient, true);
  assert.match(missing.answer, /certeza limitada/);
  const kept = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca, com certeza limitada.", pmid: "71" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /certeza limitada/);
});

test("DM2 colado ao fármaco não entra na consulta", () => {
  const question = "quais indicações de uso de sglt2 na prática de saúde da família";
  const scoped = conceptsForQuestion(sanitizeConcepts({
    concepts: [
      ["Sodium-Glucose Transporter 2 Inhibitors", "DM2", "type 2 diabetes mellitus"],
      ["Diabetes Mellitus, Type 2"],
      ["T2DM"],
      ["diabetic kidney disease"],
    ],
  }), question);
  const query = evidenceQuery(scoped, "2026/11/12");
  assert.doesNotMatch(query, /diabetes|t2dm|\bdm2\b|niddm|diabetic/i);
  assert.match(query, /sodium-glucose transporter 2 inhibitors/);
});

test("diretriz de sociedade vem primeiro e o corpo da diretriz abre IC e DRC", async () => {
  const plain = record("30", "Diretriz", "sglt2 inhibitors heart failure");
  const kdigo = record("31", "Diretriz", "sglt2 inhibitors kidney");
  kdigo.title = "KDIGO guideline on SGLT2 inhibitors";
  const caution = record("32", "Revisão sistemática", "sglt2 inhibitors perioperative");
  caution.title = "Perioperative management of SGLT2 inhibitors";
  caution.abstract = "CONCLUSIONS: Withhold SGLT2 inhibitors before surgery.";
  const merged = mergeIndicationRecords({
    guidelines: [plain, kdigo],
    metas: [],
    recent: Array.from({ length: 6 }, (_, index) => record(String(40 + index), "Revisão sistemática", "sglt2 inhibitors outcome")),
    supplemental: [],
    cautions: [caution],
    concept: ["sglt2 inhibitors"],
    question: "indicações de sglt2",
    limit: 6,
  });
  assert.equal(merged[0].pmid, "31");
  assert.equal(merged[1].pmid, "32");
  assert.equal(merged.length, 6);
  const guide = record("33", "Diretriz", "sglt2 inhibitors");
  guide.title = "KDIGO guideline on SGLT2 inhibitors";
  guide.abstract = "RECOMMENDATIONS: SGLT2 inhibitors are used in HFrEF and in chronic kidney disease. CONCLUSIONS: Further trials are welcome.";
  assert.deepEqual(conditionsFromGuideline(guide, "indicações de sglt2"), ["chronic kidney disease", "heart failure"]);
  const seen: string[] = [];
  await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    ai: {
      async searchTerms() {
        return JSON.stringify({ concepts: [["sglt2 inhibitors"]] });
      },
      async summarize() {
        return JSON.stringify({ itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca", pmid: "33" }] });
      },
    },
    search: async (term) => {
      seen.push(term);
      if (/adverse effects|perioperative/i.test(term)) return [caution];
      if (/Practice Guideline/i.test(term) && !/heart failure|kidney/i.test(term)) return [guide];
      return [];
    },
  });
  assert.ok(seen.some((term) => /heart failure/i.test(term) && /HFrEF/i.test(term)));
  assert.ok(seen.some((term) => /chronic kidney disease/i.test(term)));
  assert.ok(seen.some((term) => /adverse effects/i.test(term) && /perioperative/i.test(term)));
  assert.match(SUMMARY_SYSTEM, /esteato-hepatite associada à disfunção metabólica/);
  assert.match(SUMMARY_SYSTEM, /Cuidados:/);
});

test("o front mostra as três etapas da pergunta", async () => {
  const stages: string[] = [];
  const article = record("44", "Diretriz", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced hospitalization for heart failure.";
  await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2",
    onStage: (stage) => stages.push(stage),
    ai: {
      async searchTerms() {
        return JSON.stringify({ concepts: [["sglt2 inhibitors"]] });
      },
      async summarize() {
        return JSON.stringify({ itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca", pmid: "44" }] });
      },
    },
    search: async () => [article],
  });
  assert.deepEqual(stages, ["pubmed", "reading", "writing"]);
  const screen = readFileSync(new URL("../../components/cardio/clinical-question.tsx", import.meta.url), "utf8");
  assert.match(screen, /Buscando no PubMed…/);
  assert.match(screen, /Lendo artigos…/);
  assert.match(screen, /Escrevendo resposta…/);
});

test("certeza baixa em outra frase não derruba o achado de alta certeza", () => {
  const article = record("35404670", "Revisão sistemática", "sglt2 inhibitors");
  article.abstract = "SGLT2 inhibitors reduced heart failure hospitalization with high certainty. SGLT2 inhibitors increased genital infection with high certainty. Evidence on fractures has low certainty.";
  const answer = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca.", pmid: "35404670" },
      { texto: "Os inibidores de SGLT2 aumentaram a infecção genital.", pmid: "35404670" },
    ],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.doesNotMatch(answer.answer, /certeza limitada|certeza baixa/);
  assert.match(answer.answer, /hospitalização/);
  assert.match(answer.answer, /infecção genital/);
});

test("cotransportador sem o 2 e os gliflozinas contam como a classe", () => {
  const article = record("32036861", "Diretriz", "CCS");
  article.title = "CCS guideline for sodium glucose cotransporter inhibitors";
  article.abstract = "CONCLUSIONS: Sodium glucose cotransporter inhibitors reduce hospitalization for heart failure.";
  const selected = selectForSynthesis([article], ["sglt2 inhibitors"], 6, "indicações de sglt2");
  assert.deepEqual(selected.map((item) => item.pmid), ["32036861"]);
  const answer = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca.", pmid: "32036861" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  const amyloid = record("41171219", "Diretriz", "amiloidose");
  amyloid.title = "Transthyretin amyloidosis guideline";
  amyloid.abstract = "BACKGROUND: SGLT2 inhibitors are used in heart failure.\nCONCLUSIONS: Tafamidis is used for transthyretin amyloidosis.";
  assert.deepEqual(selectForSynthesis([amyloid], ["sglt2 inhibitors"], 6, "indicações de sglt2").map((item) => item.pmid), []);
});

test("DM2 sai dos termos da IA e volta só como metanálise pedida pela diretriz", async () => {
  const seen: Array<{ term: string; kind?: string }> = [];
  const guide = record("50", "Diretriz", "sglt2 inhibitors");
  guide.abstract = "CONCLUSIONS: SGLT2 inhibitors are indicated in type 2 diabetes.";
  let calls = 0;
  await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    cacheTerms: true,
    ai: {
      async searchTerms() {
        calls += 1;
        return JSON.stringify({ concepts: [["sglt2 inhibitors"], ["DM2"], ["prática de saúde da família"], ["atenção primária"], ["healthcare"]] });
      },
      async summarize() {
        return JSON.stringify({ itens: [{ texto: "Os inibidores de SGLT2 reduziram a hospitalização por insuficiência cardíaca", pmid: "50" }] });
      },
    },
    search: async (term, options) => {
      seen.push({ term, kind: options?.kind });
      if (options?.kind === "guideline" && !/type 2 diabetes/i.test(term)) return [guide];
      if (options?.kind === "meta" && /type 2 diabetes/i.test(term) && /cardiovascular/i.test(term)) {
        return [record("51", "Meta-análise", "sglt2 inhibitors type 2 diabetes cardiovascular kidney")];
      }
      return [];
    },
  });
  assert.equal(seen.some((item) => /\bdm2\b/i.test(item.term)), false);
  assert.equal(seen.some((item) => /saúde da família|atenção primária|healthcare/i.test(item.term)), false);
  assert.equal(seen.some((item) => item.kind === "meta" && /type 2 diabetes/i.test(item.term) && /cardiovascular/i.test(item.term) && /kidney/i.test(item.term)), true);
  await answerClinicalQuestion({
    question: "Quais indicações de uso de SGLT2 na prática de saúde da família?",
    cacheTerms: true,
    ai: {
      async searchTerms() {
        calls += 1;
        return JSON.stringify({ concepts: [["totally different"]] });
      },
      async summarize() {
        return JSON.stringify({ sufficient: false, answer: "", citations: [] });
      },
    },
    search: async () => [],
  });
  assert.equal(calls, 1);
});

test("pré-diabetes exige a condição no título ou no resumo e a primeira linha responde a pergunta", () => {
  const acne = record("60", "Revisão sistemática", "metformin acne gastrointestinal events");
  const onTopic = record("61", "Revisão sistemática", "metformin prediabetes progression");
  const selected = selectForSynthesis([acne, onTopic], ["metformin"], 6, "Metformina no pré-diabetes");
  assert.deepEqual(selected.map((item) => item.pmid), ["61"]);
  assert.match(SUMMARY_SYSTEM, /primeira linha responde direto/);
  const screen = readFileSync(new URL("../../components/cardio/clinical-question.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/premium.css", import.meta.url), "utf8");
  assert.match(screen, /item\.type/);
  assert.match(css, /-webkit-line-clamp:\s*2/);
});

test("frase que copia o exemplo do prompt sai quando o resumo não diz isso", () => {
  const article = record("12345678", "Revisão sistemática", "sglt2");
  article.abstract = "Reduced hospitalization for heart failure.";
  const answer = validateSynthesis(JSON.stringify({
    sufficient: true,
    answer: "- Indicado com critérios práticos de TFG e albuminúria [1].\n- Reduziu hospitalização por insuficiência cardíaca [1].",
    citations: ["12345678"],
  }), [article]);
  assert.equal(answer.sufficient, true);
  assert.doesNotMatch(answer.answer, /TFG|albuminúria|critérios práticos|Condição:/i);
  assert.match(answer.answer, /hospitalização por insuficiência cardíaca \[1\]/);
});

test("limites de plano: anônimo, grátis, assinante e outro dia", async () => {
  const db = memoryDb();
  const day = new Date("2026-06-15T15:00:00Z");
  const anon = () => reserveClinicalQuota(db, { ip: "203.0.113.9" }, day);
  assert.equal((await anon()).allowed, true);
  const blocked = await anon();
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.plan, "anonymous");
  assert.equal(blocked.limit, 1);
  assert.match(quotaMessage(blocked.plan, blocked.limit), /sem conta/);

  await db.prepare("INSERT INTO subscriptions (user_id, plan, status, updated_at) VALUES (?, 'free', 'inactive', 1)").bind("user-free-1").run();
  for (let count = 0; count < 3; count += 1) {
    assert.equal((await reserveClinicalQuota(db, { userId: "user-free-1" }, day)).allowed, true);
  }
  const freeBlocked = await reserveClinicalQuota(db, { userId: "user-free-1" }, day);
  assert.equal(freeBlocked.allowed, false);
  assert.equal(freeBlocked.plan, "free");

  await db.prepare(
    "INSERT INTO subscriptions (user_id, plan, status, updated_at) VALUES (?, 'subscriber', 'active', 1)",
  ).bind("user-paid-1").run();
  for (let count = 0; count < 40; count += 1) {
    assert.equal((await reserveClinicalQuota(db, { userId: "user-paid-1" }, day)).allowed, true);
  }
  assert.equal((await reserveClinicalQuota(db, { userId: "user-paid-1" }, day)).allowed, false);

  const nextDay = new Date("2026-06-16T15:00:00Z");
  assert.equal((await reserveClinicalQuota(db, { ip: "203.0.113.9" }, nextDay)).allowed, true);

  const refundDb = memoryDb();
  const held = await reserveClinicalQuota(refundDb, { ip: "198.51.100.4" }, day);
  assert.equal(held.allowed, true);
  await releaseClinicalQuota(refundDb, held.key, held.day);
  assert.equal((await reserveClinicalQuota(refundDb, { ip: "198.51.100.4" }, day)).allowed, true);
});

test("provedor fixture só na prévia e Workers AI lê response objeto, string e choices", async () => {
  assert.equal(createClinicalAi({ CLINICAL_AI_PROVIDER: "fixture" }), null);
  assert.equal(createClinicalAi({}), null);
  assert.ok(createClinicalAi({ CLINICAL_AI_PROVIDER: "fixture", LOCAL_PREVIEW_ENABLED: "true" }));
  const calls: unknown[] = [];
  let model = "";
  const ai = createWorkersAi({
    async run(name, input) {
      model = name;
      calls.push(input);
      if (calls.length === 1) return { response: { concepts: [["asthma"]] } };
      return { choices: [{ message: { content: { sufficient: false, answer: "", citations: [] } } }] };
    },
  }, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.match(await ai.searchTerms("asma"), /asthma/);
  assert.equal((calls[0] as { temperature: number }).temperature, 0);
  assert.match(JSON.stringify(calls[0]), /json_schema/);
  assert.match(await ai.summarize("asma na atenção primária?", []), /sufficient/);
  assert.match(JSON.stringify(calls[1]), /itens/);
  assert.equal(model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  const fallback = createWorkersAi({
    async run() {
      throw new Error("JSON Mode couldn't be met");
    },
  });
  await assert.rejects(() => fallback.searchTerms("asma"));
});
