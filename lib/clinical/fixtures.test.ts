import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerClinicalQuestion } from "./answer";
import { SUMMARY_SYSTEM } from "./prompts";
import { mergeIndicationRecords, selectForSynthesis } from "./select";
import { evidenceQuery, expandClassTerms } from "./terms";
import { validateSynthesis } from "./validate";
import type { EvidenceRecord } from "./types";

const PMIDs = [
  "35404670",
  "42914763",
  "38583093",
  "42811398",
  "37465122",
  "39781571",
  "36351458",
  "35961754",
  "32036861",
  "39163798",
  "41151201",
];

type Row = { pmid: string; title: string; types: string[]; abstract: string };

const rows = JSON.parse(readFileSync(new URL("./fixtures/real-abstracts.json", import.meta.url), "utf8")) as Row[];

function fixture(pmid: string): EvidenceRecord {
  const row = rows.find((item) => item.pmid === pmid);
  if (!row) throw new Error(`PMID ausente na fixture: ${pmid}`);
  return {
    pmid,
    title: row.title,
    journal: "PubMed",
    date: "2024",
    authors: "",
    type: row.types.join(", "),
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    abstract: row.abstract,
  };
}

function filler(pmid: string): EvidenceRecord {
  return {
    pmid,
    title: `SGLT2 inhibitors outcome ${pmid}`,
    journal: "Journal",
    date: "2023",
    authors: "",
    type: "Revisão sistemática",
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    abstract: "CONCLUSIONS: SGLT2 inhibitors reduced hospitalization for heart failure.",
  };
}

test("fixtures reais trazem os onze resumos do PubMed", () => {
  assert.deepEqual(rows.map((row) => row.pmid), PMIDs);
  for (const row of rows) {
    assert.ok(row.title.length > 40, row.pmid);
    assert.ok(row.abstract.includes(":"), row.pmid);
    assert.ok(row.abstract.length > 400, row.pmid);
    assert.ok(row.types.length > 0, row.pmid);
  }
  assert.match(fixture("35404670").abstract, /high certainty/);
  assert.match(fixture("35404670").abstract, /genital infections/);
  assert.match(fixture("42914763").abstract, /these findings should be interpreted cautiously/);
  assert.match(fixture("38583093").abstract, /^BACKGROUND:/);
  assert.match(fixture("35961754").title, /Canadian Cardiovascular Society/);
  assert.match(fixture("39163798").abstract, /750 mg/);
  assert.match(fixture("41151201").title, /umbrella review/i);
});

test("35404670: hospitalização por IC e infecção genital ficam sem ressalva", () => {
  const article = fixture("35404670");
  const answer = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "Os inibidores de SGLT2 reduziram as hospitalizações por IC.", pmid: "35404670" },
      { texto: "Os inibidores de SGLT2 aumentaram a infecção genital.", pmid: "35404670" },
    ],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /hospitalizações por IC/);
  assert.match(answer.answer, /infecção genital/);
  assert.doesNotMatch(answer.answer, /certeza limitada|certeza baixa|cautela/);
});

test("42914763: MASH recebe a ressalva genérica da mesma frase", () => {
  const answer = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 melhoraram os parâmetros hepáticos e metabólicos.", pmid: "42914763" }],
  }), [fixture("42914763")], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /hepáticos/);
  assert.match(answer.answer, /certeza limitada/);
});

test("38583093: hospitalização por IC só da introdução é rejeitada", () => {
  const article = fixture("38583093");
  const rejected = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a hospitalização por IC.", pmid: "38583093" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(rejected.sufficient, false);
  const kept = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem eventos cardiovasculares.", pmid: "38583093" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /cardiovasculares/);
  assert.doesNotMatch(kept.answer, /hospitaliza/);
});

test("42811398 mantém o qualificador associado à metformina", () => {
  const article = fixture("42811398");
  const dropped = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduziram a hemoglobina glicada.", pmid: "42811398" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(dropped.sufficient, false);
  const kept = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 associados à metformina reduziram a hemoglobina glicada.", pmid: "42811398" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /associados à metformina/);
});

test("35961754 e 36351458 ocupam vaga e sarcopenia não entra como indicação", () => {
  const caution = fixture("39781571");
  const merged = mergeIndicationRecords({
    guidelines: [filler("9001"), fixture("35961754"), fixture("32036861")],
    metas: [fixture("37465122")],
    outcomes: [fixture("36351458"), filler("9002")],
    recent: [fixture("37465122"), ...Array.from({ length: 6 }, (_, index) => filler(String(9100 + index)))],
    supplemental: [],
    cautions: [caution],
    concept: ["sglt2 inhibitors"],
    question: "quais indicações de uso de sglt2",
    limit: 6,
  });
  const ids = merged.map((item) => item.pmid);
  assert.equal(ids[0], "35961754");
  assert.ok(ids.includes("36351458"));
  assert.ok(ids.includes("32036861"));
  assert.ok(ids.includes("39781571"));
  assert.equal(ids.includes("37465122"), false);
  assert.equal(ids.length, 6);
  const sarcopeniaOnly = mergeIndicationRecords({
    guidelines: [fixture("35961754")],
    metas: [],
    outcomes: [fixture("36351458")],
    recent: [fixture("37465122")],
    supplemental: [],
    cautions: [],
    concept: ["sglt2 inhibitors"],
    question: "quais indicações de uso de sglt2",
    limit: 6,
  });
  assert.deepEqual(sarcopeniaOnly.map((item) => item.pmid), ["35961754", "36351458", "37465122"]);
  const renal = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a progressão da DRC, com ou sem DM2.", pmid: "36351458" }],
  }), [fixture("36351458")], ["sglt2 inhibitors"]);
  assert.equal(renal.sufficient, true);
  assert.match(renal.answer, /DRC/);
  assert.match(renal.answer, /DM2/);
});

test("32036861 continua selecionável pelo cotransportador sem o algarismo 2", () => {
  const selected = selectForSynthesis([fixture("32036861")], ["sglt2 inhibitors"], 6, "indicações de sglt2");
  assert.deepEqual(selected.map((item) => item.pmid), ["32036861"]);
});

test("39163798: reduz sem comparação de doses sai; comparando doses, 750 mg/dia fica", () => {
  const article = fixture("39163798");
  const refused = validateSynthesis(JSON.stringify({
    itens: [{ texto: "A metformina reduz a incidência de diabetes.", pmid: "39163798" }],
  }), [article], ["metformin"]);
  assert.equal(refused.sufficient, false);
  const kept = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Comparando doses, 750 mg/dia de metformina reduziu a incidência de diabetes.", pmid: "39163798" }],
  }), [article], ["metformin"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /Comparando doses, 750 mg\/dia/);
});

test("41151201 e a NMA de exercício com metformina vêm na frente no pré-diabetes", () => {
  const umbrella = fixture("41151201");
  const nma: EvidenceRecord = {
    ...filler("42800000"),
    title: "Exercise versus metformin in prediabetes: a network meta-analysis",
    type: "Network Meta-Analysis",
    abstract: "RESULTS: Network meta-analysis of exercise and metformin in prediabetes.",
  };
  const other = fixture("39163798");
  const selected = selectForSynthesis([other, nma, umbrella], ["metformin"], 6, "Metformina no pré-diabetes");
  assert.deepEqual(selected.map((item) => item.pmid), ["41151201", "42800000", "39163798"]);
});

test("a consulta fixa de indicação amplia a classe e pede diretriz e desfecho renal", async () => {
  const query = evidenceQuery([expandClassTerms(["Sodium-Glucose Transporter 2 Inhibitors"])], "2026/11/12");
  assert.match(query, /SGLT2 inhibitors/);
  assert.match(query, /sodium-glucose co-transporter/);
  assert.doesNotMatch(query, /AND NOT/);
  const seen: Array<{ term: string; kind?: string; sort?: string }> = [];
  await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2 na prática de saúde da família",
    ai: {
      async searchTerms() {
        return JSON.stringify({ concepts: [["Sodium-Glucose Transporter 2 Inhibitors"]] });
      },
      async summarize() {
        return JSON.stringify({ itens: [] });
      },
    },
    search: async (term, options) => {
      seen.push({ term, kind: options?.kind, sort: options?.sort });
      return [];
    },
  });
  const guideline = seen.find((item) => item.kind === "guideline" && item.sort === "relevance");
  const outcome = seen.find((item) => item.kind === "meta" && /kidney outcomes/i.test(item.term) && /cardiovascular outcomes/i.test(item.term));
  assert.ok(guideline);
  assert.match(guideline.term, /Practice Guideline/);
  assert.match(guideline.term, /sodium-glucose co-transporter/);
  assert.match(guideline.term, /SGLT2 inhibitors/);
  assert.ok(outcome);
  assert.equal(outcome.sort, "relevance");
  assert.match(SUMMARY_SYSTEM, /até 40 palavras/);
  assert.match(SUMMARY_SYSTEM, /associado à metformina/);
  assert.match(SUMMARY_SYSTEM, /comparando doses, 750 mg\/dia/);
  assert.doesNotMatch(SUMMARY_SYSTEM, /curta/);
});
