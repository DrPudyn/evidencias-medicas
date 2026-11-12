import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerClinicalQuestion } from "./answer";
import { SUMMARY_SYSTEM, YES_NO_LINE } from "./prompts";
import { mergeIndicationRecords, selectForSynthesis } from "./select";
import { evidenceQuery, expandClassTerms, forceMetforminType2, readResultCache, writeResultCache } from "./terms";
import { normalizeOddCaps, validateSynthesis } from "./validate";
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
  "41202026",
  "41203232",
  "40884036",
  "32877652",
  "30424892",
  "33031522",
  "30697905",
  "33441402",
  "39899304",
  "30653708",
  "34693515",
  "40892608",
  "40813122",
  "28941313",
  "39242178",
  "38639549",
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

test("fixtures reais trazem os resumos do PubMed", () => {
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
  assert.match(fixture("41202026").abstract, /irrespective of diabetes status/);
  assert.match(fixture("41203232").abstract, /\(CKD\)/);
  assert.match(fixture("40884036").abstract, /totality of randomized clinical trial data/);
  assert.match(fixture("42914763").abstract, /type II DM/);
  assert.match(fixture("32877652").abstract, /suggest that these agents also improve renal outcomes/);
  assert.match(fixture("30424892").title, /type 2 diabetes/);
  assert.match(fixture("33031522").title, /Type 2 Diabetes/);
  assert.match(fixture("30697905").title, /type 2 diabetes mellitus and chronic kidney disease/i);
  assert.match(fixture("33441402").abstract, /placebo/);
  assert.match(fixture("39899304").abstract, /individuals with typ/);
  assert.match(fixture("30653708").abstract, /adults with Type 2 diabetes/i);
  assert.match(fixture("40892608").abstract, /quadruple therapy/);
  assert.match(fixture("28941313").abstract, /Ranking probability/);
  assert.match(fixture("39242178").abstract, /superior to metformin/);
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
  assert.doesNotMatch(answer.answer, /certeza limitada|certeza baixa|cautela|\bpode\b/);
});

test("42914763: MASH com DM2 passa e a ressalva não vira item de Cuidados", () => {
  const answer = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "Os inibidores de SGLT2 melhoraram os parâmetros hepáticos e metabólicos em pessoas com DM2.", pmid: "42914763" },
      { texto: "Cuidados: os achados têm certeza limitada e pedem cautela.", pmid: "42914763" },
    ],
  }), [fixture("42914763")], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /hepáticos/);
  assert.match(answer.answer, /DM2/);
  assert.match(answer.answer, /certeza limitada/);
  assert.doesNotMatch(answer.answer, /Cuidados:/);
  const orphan = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "Os inibidores de SGLT2 reduzem a hospitalização por IC.", pmid: "38583093" },
      { texto: "Cuidados: certeza limitada.", pmid: "38583093" },
    ],
  }), [fixture("38583093")], ["sglt2 inhibitors"]);
  assert.equal(orphan.sufficient, false);
  assert.doesNotMatch(orphan.answer, /Cuidados:|certeza limitada/);
});

test("38583093: hospitalização por IC só da introdução é rejeitada", () => {
  const article = fixture("38583093");
  const rejected = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a hospitalização por IC.", pmid: "38583093" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(rejected.sufficient, false);
  const kept = validateSynthesis(JSON.stringify({
    itens: [{ texto: "IniciaÇÃO com iSGLT2, eGFR, SGLT2i e HbA1c reduz a morte cardiovascular.", pmid: "38583093" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer, /Iniciação/);
  assert.match(kept.answer, /iSGLT2/);
  assert.match(kept.answer, /eGFR/);
  assert.match(kept.answer, /SGLT2i/);
  assert.match(kept.answer, /HbA1c/);
  assert.match(kept.answer, /morte cardiovascular/);
  assert.doesNotMatch(kept.answer, /IniciaÇÃO|isglt2|hospitaliza/);
  assert.equal(normalizeOddCaps("IniciaÇÃO de iSGLT2, eGFR, SGLT2i e HbA1c"), "Iniciação de iSGLT2, eGFR, SGLT2i e HbA1c");
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

test("32877652 e 39163798 recebem pode quando o trecho diz suggest ou may", () => {
  const renal = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 melhoram os desfechos renais.", pmid: "32877652" }],
  }), [fixture("32877652")], ["sglt2 inhibitors"]);
  assert.equal(renal.sufficient, true);
  assert.match(renal.answer, /podem melhorar os desfechos renais/);
  const partial = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 pode melhorar os desfechos renais e reduz a morte.", pmid: "32877652" }],
  }), [fixture("32877652")], ["sglt2 inhibitors"]);
  assert.equal(partial.sufficient, true);
  assert.match(partial.answer, /pode melhorar os desfechos renais e reduzir a morte/);
  assert.doesNotMatch(partial.answer, /e reduz /);
  const already = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 sugerem melhora dos desfechos renais.", pmid: "32877652" }],
  }), [fixture("32877652")], ["sglt2 inhibitors"]);
  assert.equal(already.sufficient, true);
  assert.match(already.answer, /sugerem melhora/);
  assert.doesNotMatch(already.answer, /pode sugerem|podem sugerem/);
  const dose = validateSynthesis(JSON.stringify({
    itens: [{ texto: "750 mg/dia representa a dose ótima.", pmid: "39163798" }],
  }), [fixture("39163798")], ["metformin"]);
  assert.equal(dose.sufficient, true);
  assert.match(dose.answer, /pode representar a dose ótima/);
});

test("30424892 e 33031522 ocupam a vaga de DM2 e a metanálise de IC não", () => {
  const merged = mergeIndicationRecords({
    guidelines: [fixture("35961754")],
    metas: [],
    outcomes: [fixture("32877652"), fixture("30424892"), fixture("33031522")],
    recent: Array.from({ length: 6 }, (_, index) => filler(String(9200 + index))),
    supplemental: [],
    cautions: [],
    concept: ["sglt2 inhibitors"],
    question: "quais indicações de uso de sglt2",
    limit: 6,
  });
  const ids = merged.map((item) => item.pmid);
  assert.deepEqual(ids.slice(1, 4), ["30424892", "33031522", "32877652"]);
  const reversed = mergeIndicationRecords({
    guidelines: [fixture("35961754")],
    metas: [],
    outcomes: [fixture("33031522"), fixture("32877652"), fixture("30424892")],
    recent: Array.from({ length: 6 }, (_, index) => filler(String(9200 + index))),
    supplemental: [],
    cautions: [],
    concept: ["sglt2 inhibitors"],
    question: "quais indicações de uso de sglt2",
    limit: 6,
  }).map((item) => item.pmid);
  assert.deepEqual(reversed, ids);
});

test("população em adults, people ou título não descarta a frase de DM2", () => {
  const cardiovascular = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2: pode reduzir eventos CV.", pmid: "39899304" }],
  }), [fixture("39899304")], ["sglt2 inhibitors"]);
  assert.equal(cardiovascular.sufficient, true);
  assert.match(cardiovascular.answer, /^DM2:/);
  assert.match(cardiovascular.answer, /eventos CV/);
  const younger = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2: pode reduzir a internação por IC.", pmid: "30653708" }],
  }), [fixture("30653708")], ["sglt2 inhibitors"]);
  assert.equal(younger.sufficient, true);
  assert.match(younger.answer, /^DM2:/);
  assert.match(younger.answer, /internação por IC/);
  const established = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2: pode reduzir a internação por IC.", pmid: "34693515" }],
  }), [fixture("34693515")], ["sglt2 inhibitors"]);
  assert.equal(established.sufficient, true);
  assert.match(established.answer, /^DM2 com DCV:/);
  assert.match(established.answer, /internação por IC/);
  assert.doesNotMatch(established.answer, /\bpode\b/);
  const reduced = validateSynthesis(JSON.stringify({
    itens: [{ texto: "ICFEr: pode reduzir a morte.", pmid: "40892608" }],
  }), [fixture("40892608")], ["sglt2 inhibitors"]);
  assert.equal(reduced.sufficient, true);
  assert.match(reduced.answer, /^ICFEr:/);
  const unknown = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2: Os inibidores de SGLT2 reduzem a hospitalização por IC.", pmid: "35404670" }],
  }), [fixture("35404670")], ["sglt2 inhibitors"]);
  assert.equal(unknown.sufficient, true);
  assert.match(unknown.answer, /hospitalização por IC/);
});

test("terapia quádrupla não ocupa a vaga de IC", () => {
  const merged = mergeIndicationRecords({
    guidelines: [fixture("35961754")],
    metas: [],
    outcomes: [fixture("40892608"), fixture("32877652"), fixture("30424892"), fixture("33031522")],
    recent: [],
    supplemental: [],
    cautions: [],
    concept: ["sglt2 inhibitors"],
    question: "quais indicações de uso de sglt2",
    limit: 6,
  });
  const ids = merged.map((item) => item.pmid);
  assert.equal(ids[3], "32877652");
  assert.equal(ids.includes("40892608"), false);
});

test("card só com cuidados pede outra síntese", async () => {
  let calls = 0;
  const answer = await answerClinicalQuestion({
    question: "quais indicações de uso de sglt2",
    ai: {
      async searchTerms() {
        return JSON.stringify({ concepts: [["sglt2 inhibitors"]] });
      },
      async summarize() {
        calls += 1;
        if (calls === 1) {
          return JSON.stringify({ itens: [{ texto: "Cuidados: suspender antes da cirurgia.", pmid: "39899304" }] });
        }
        return JSON.stringify({
          itens: [
            { texto: "DM2: pode reduzir eventos CV.", pmid: "39899304" },
            { texto: "DM2: pode reduzir eventos CV em pessoas mais velhas.", pmid: "39899304" },
          ],
        });
      },
    },
    search: async () => [fixture("39899304")],
  });
  assert.ok(calls >= 2);
  assert.match(answer.answer, /eventos CV/);
  assert.ok(answer.answer.split("\n").filter((line) => line.trim() && !/^Cuidados\b/.test(line.trim())).length >= 1);
});

test("ranqueamento não vira redução e a superioridade do exercício aparece", () => {
  const ranking = validateSynthesis(JSON.stringify({
    itens: [{ texto: "A metformina reduz o risco, com probabilidade de 87% de ser a melhor.", pmid: "28941313" }],
  }), [fixture("28941313")], ["metformin"]);
  assert.equal(ranking.sufficient, false);
  const exercise = validateSynthesis(JSON.stringify({
    itens: [{ texto: "A metformina reduz a glicemia no pré-diabetes.", pmid: "39242178" }],
  }), [fixture("39242178")], ["metformin"]);
  assert.equal(exercise.sufficient, false);
  const named = validateSynthesis(JSON.stringify({
    itens: [{ texto: "O exercício é superior à metformina no pré-diabetes.", pmid: "39242178" }],
  }), [fixture("39242178")], ["metformin"]);
  assert.equal(named.sufficient, true);
  assert.match(named.answer, /exercício/);
  assert.match(YES_NO_LINE, /incidência de diabetes/);
  assert.match(YES_NO_LINE, /SUCRA/);
  assert.match(YES_NO_LINE, /exercício ou estilo de vida/);
});

test("36351458 não usa o contexto de benefício cardiovascular já estabelecido", () => {
  const article = fixture("36351458");
  const context = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem eventos cardiovasculares em DM2 de alto risco.", pmid: "36351458" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(context.sufficient, false);
  const kidney = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a progressão da doença renal.", pmid: "36351458" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(kidney.sufficient, true);
  assert.match(kidney.answer, /doença renal/);
});

test("o rótulo segue a população do estudo, não o desfecho", () => {
  const zelniker = validateSynthesis(JSON.stringify({
    itens: [{ texto: "IC: Os inibidores de SGLT2 reduzem a hospitalização por IC.", pmid: "30424892" }],
  }), [fixture("30424892")], ["sglt2 inhibitors"]);
  assert.equal(zelniker.sufficient, true);
  assert.match(zelniker.answer, /^DM2:/);
  assert.doesNotMatch(zelniker.answer, /^IC:/);
  const kidneyDiabetes = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2 com DRC: Os inibidores de SGLT2 reduzem desfechos cardiovasculares e renais.", pmid: "30697905" }],
  }), [fixture("30697905")], ["sglt2 inhibitors"]);
  assert.equal(kidneyDiabetes.sufficient, true);
  assert.match(kidneyDiabetes.answer, /^DM2 com DRC:/);
  const mislabeled = validateSynthesis(JSON.stringify({
    itens: [{ texto: "IC: Os inibidores de SGLT2 reduzem a internação por IC.", pmid: "33441402" }],
  }), [fixture("33441402")], ["sglt2 inhibitors"]);
  assert.equal(mislabeled.sufficient, true);
  assert.match(mislabeled.answer, /^DM2:/);
  assert.doesNotMatch(mislabeled.answer, /^IC:/);
});

test("pergunta sim/não diz o efeito contra o controle quando o trecho compara", () => {
  const question = "Os inibidores de SGLT2 reduzem a mortalidade?";
  const bare = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a mortalidade.", pmid: "33441402" }],
  }), [fixture("33441402")], ["sglt2 inhibitors"], question);
  assert.equal(bare.sufficient, false);
  const compared = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a mortalidade em relação ao placebo.", pmid: "33441402" }],
  }), [fixture("33441402")], ["sglt2 inhibitors"], question);
  assert.equal(compared.sufficient, true);
  assert.match(compared.answer, /placebo/);
});

test("41202026 mantém benefício renal, hospitalização e mortalidade com ou sem diabetes", () => {
  const answer = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 trazem benefícios renais, de hospitalização e de mortalidade independentemente de diabetes.", pmid: "41202026" }],
  }), [fixture("41202026")], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /renais/);
  assert.match(answer.answer, /hospitalização/);
  assert.match(answer.answer, /mortalidade/);
  assert.match(answer.answer, /diabetes/);
});

test("41203232 aceita DRC quando o resultado diz CKD", () => {
  const answer = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Os inibidores de SGLT2 reduzem a progressão da DRC.", pmid: "41203232" }],
  }), [fixture("41203232")], ["sglt2 inhibitors"]);
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /DRC/);
});

test("40884036: o negativo isolado sai e a conclusão do conjunto fica", () => {
  const article = fixture("40884036");
  const isolated = validateSynthesis(JSON.stringify({
    itens: [{ texto: "A dapagliflozina não reduziu a morte cardiovascular nem a piora da IC.", pmid: "40884036" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(isolated.sufficient, false);
  const pooled = validateSynthesis(JSON.stringify({
    itens: [{ texto: "O conjunto dos ensaios sugere que iniciar iSGLT2 na internação pode reduzir a morte cardiovascular ou a piora da IC.", pmid: "40884036" }],
  }), [article], ["sglt2 inhibitors"]);
  assert.equal(pooled.sufficient, true);
  assert.match(pooled.answer, /conjunto dos ensaios/);
  assert.match(pooled.answer, /pode reduzir/);
  assert.doesNotMatch(pooled.answer, /não reduziu/);
});

test("39163798: reduz sem comparação de doses sai; comparando doses, 750 mg/dia fica", () => {
  const article = fixture("39163798");
  const refused = validateSynthesis(JSON.stringify({
    itens: [{ texto: "A metformina reduz a incidência de diabetes em comparação com outras doses.", pmid: "39163798" }],
  }), [article], ["metformin"]);
  assert.equal(refused.sufficient, false);
  const onlyDose = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Comparando doses, 750 mg/dia de metformina reduziu a incidência de diabetes.", pmid: "39163798" }],
  }), [article], ["metformin"], "A metformina reduz a progressão para diabetes?");
  assert.equal(onlyDose.sufficient, true);
  assert.match(onlyDose.answer, /Comparando doses, 750 mg\/dia/);
  const mixed = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "A metformina reduz a incidência de diabetes em relação ao placebo.", pmid: "41151201" },
      { texto: "Comparando doses, 750 mg/dia de metformina reduz a progressão para diabetes.", pmid: "39163798" },
    ],
  }), [fixture("41151201"), article], ["metformin"], "A metformina reduz a progressão para diabetes?");
  assert.equal(mixed.sufficient, true);
  assert.match(mixed.answer, /placebo/);
  assert.doesNotMatch(mixed.answer, /Comparando doses/);
  const kept = validateSynthesis(JSON.stringify({
    itens: [
      { texto: "A metformina reduz a incidência de diabetes em relação ao placebo.", pmid: "41151201" },
      { texto: "Comparando doses, 750 mg/dia de metformina reduziu a incidência de diabetes.", pmid: "39163798" },
    ],
  }), [fixture("41151201"), article], ["metformin"], "A metformina reduz a incidência de diabetes?");
  assert.equal(kept.sufficient, true);
  assert.match(kept.answer.split("\n")[0], /placebo/);
  assert.match(kept.answer, /Comparando doses, 750 mg\/dia/);
  assert.doesNotMatch(kept.answer.split("\n")[0], /Comparando doses/);
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
  const placeboNma: EvidenceRecord = {
    ...filler("42800001"),
    title: "Network meta-analysis of metformin in prediabetes",
    abstract: "RESULTS: Metformin reduced diabetes versus placebo.",
  };
  const yesNo = selectForSynthesis([other, placeboNma, umbrella], ["metformin"], 6, "A metformina reduz a progressão do pré-diabetes?");
  assert.deepEqual(yesNo.map((item) => item.pmid), ["41151201", "42800001", "39163798"]);
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
  const guideline = seen.find((item) => item.kind === "guideline" && item.sort === "pub_date");
  const outcome = seen.find((item) => item.kind === "meta" && /kidney outcomes/i.test(item.term) && /cardiovascular outcomes/i.test(item.term));
  assert.ok(guideline);
  assert.match(guideline.term, /Practice Guideline/);
  assert.match(guideline.term, /sodium-glucose co-transporter/);
  assert.match(guideline.term, /SGLT2 inhibitors/);
  assert.ok(outcome);
  assert.equal(outcome.sort, "pub_date");
  const heartFailure = seen.find((item) => /\(SGLT2 inhibitor\*\[tiab\]\) AND heart failure\[ti\]/.test(item.term));
  assert.ok(heartFailure);
  assert.equal(heartFailure.sort, "pub_date");
  assert.match(heartFailure.term, /NOT \(combination\[tiab\] OR quadruple\[tiab\]\)/);
  assert.doesNotMatch(heartFailure.term, /AND NOT/);
  assert.match(SUMMARY_SYSTEM, /até 40 palavras/);
  assert.match(SUMMARY_SYSTEM, /associado à metformina/);
  assert.match(SUMMARY_SYSTEM, /comparando doses, 750 mg\/dia/);
  assert.match(SUMMARY_SYSTEM, /DM2 de alto risco cardiovascular não se funde com DRC/);
  assert.match(YES_NO_LINE, /umbrella review ou a metanálise em rede/);
  assert.match(YES_NO_LINE, /comparado a placebo, controle ou sem tratamento/);
  const route = readFileSync(new URL("../../app/api/clinical-question/route.ts", import.meta.url), "utf8");
  assert.match(route, /retmax: cached\?\.length \|\| 30/);
  const prediabetes = seen.find((item) => /impaired glucose tolerance/i.test(item.term) && /diabetes incidence/i.test(item.term) && /Randomized Controlled Trial/.test(item.term));
  assert.equal(prediabetes, undefined);
  assert.doesNotMatch(SUMMARY_SYSTEM, /curta/);
  const dm2Query = seen.find((item) => item.kind === "meta" && /type 2 diabetes/i.test(item.term) && /T2DM/.test(item.term) && /cardiovascular/i.test(item.term) && /renal/i.test(item.term));
  assert.ok(dm2Query);
  assert.equal(dm2Query.sort, "pub_date");
});

test("metformina no pré-diabetes busca incidência, progressão ou prevenção", async () => {
  const seen: Array<{ term: string; sort?: string; includeTrials?: boolean }> = [];
  await answerClinicalQuestion({
    question: "A metformina reduz a progressão do pré-diabetes?",
    ai: {
      async searchTerms() {
        return JSON.stringify({ concepts: [["metformin"], ["prediabetes"]] });
      },
      async summarize() {
        return JSON.stringify({ itens: [] });
      },
    },
    search: async (term, options) => {
      seen.push({ term, sort: options?.sort, includeTrials: options?.includeTrials });
      return [];
    },
  });
  const query = seen.find((item) => /impaired glucose tolerance/i.test(item.term) && /diabetes incidence/i.test(item.term) && /prevention/i.test(item.term));
  assert.ok(query);
  assert.match(query.term, /metformin/i);
  assert.match(query.term, /Randomized Controlled Trial/);
  assert.match(query.term, /Meta-Analysis/);
  assert.doesNotMatch(query.term, /AND NOT/);
  assert.equal(query.sort, "pub_date");
  assert.equal(query.includeTrials, true);
  assert.doesNotMatch(query.term, /type 2 diabetes/i);
});

test("certeza, desfecho e AVC saem do trecho citado", () => {
  const firm = validateSynthesis(JSON.stringify({
    itens: [{
      texto: "DM2: pode reduzir a morte e o AVC.",
      pmid: "38639549",
      trecho: "Compared with usual care, SGLT2 inhibitors and GLP1 agonists reduce all-cause mortality (high CoE) and major adverse cardiovascular events (MACE) (moderate to high CoE), SGLT2 inhibitors reduce progression of chronic kidney disease (CKD) and heart failure hospitalizations and GLP1 agonists reduce stroke (high CoE)",
    }],
  }), [fixture("38639549")], ["sglt2 inhibitors"]);
  assert.equal(firm.sufficient, true);
  assert.match(firm.answer, /reduz a morte/);
  assert.doesNotMatch(firm.answer, /\bpode\b/);
  assert.doesNotMatch(firm.answer, /AVC/);

  const guideline = validateSynthesis(JSON.stringify({
    itens: [{ texto: "DM2: reduz o AVC não fatal.", pmid: "35961754" }],
  }), [fixture("35961754")], ["sglt2 inhibitors"]);
  assert.equal(guideline.sufficient, false);

  const suggested = validateSynthesis(JSON.stringify({
    itens: [{
      texto: "IC: pode reduzir eventos CV e a progressão renal.",
      pmid: "39899304",
      trecho: "Analysis of age × treatment interactions suggested that SGLT2 inhibitors were more cardioprotective in older than in younger people despite smaller reductions in HbA1c; GLP-1 receptor agonists were more cardioprotective in younger people.",
    }],
  }), [fixture("39899304")], ["sglt2 inhibitors"]);
  assert.equal(suggested.sufficient, true);
  assert.match(suggested.answer, /\bpode\b/);
  assert.match(suggested.answer, /eventos CV/);
  assert.doesNotMatch(suggested.answer, /renal/);
  assert.match(suggested.answer, /^DM2:/);

  const kidney = validateSynthesis(JSON.stringify({
    itens: [{ texto: "IC: reduz a progressão da doença renal.", pmid: "30697905" }],
  }), [fixture("30697905")], ["sglt2 inhibitors"]);
  assert.match(kidney.answer, /^DM2 com DRC:/);

  const caution = validateSynthesis(JSON.stringify({
    itens: [{ texto: "Cuidados: suspender antes da cirurgia.", pmid: "39899304" }],
  }), [fixture("39899304")], ["sglt2 inhibitors"]);
  assert.equal(caution.sufficient, false);
});

test("metformina em diabetes força type 2 e a frase de dose não abre a resposta", () => {
  const concepts = forceMetforminType2([["metformin"], ["diabetes"]], "A metformina reduz eventos no diabetes?");
  assert.ok(concepts.some((concept) => concept.includes("type 2 diabetes")));
  const prediabetes = forceMetforminType2([["metformin"], ["prediabetes"]], "A metformina reduz a progressão do pré-diabetes?");
  assert.equal(prediabetes.some((concept) => concept.includes("type 2 diabetes")), false);
});

test("o conjunto de PMIDs fica estável por sete dias", async () => {
  const db = new (await import("node:sqlite")).DatabaseSync(":memory:");
  db.exec("CREATE TABLE clinical_result_cache (query_key text primary key, pmids text not null, updated_at integer not null)");
  const adapter = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              return (db.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
            },
            async run() {
              db.prepare(sql).run(...(params as never[]));
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  const key = "pub_date|30|sglt2-heart-failure-fixture";
  const writtenAt = Date.parse("2026-11-01T00:00:00Z");
  await writeResultCache(key, ["32877652", "30697905"], adapter, writtenAt);
  assert.deepEqual(await readResultCache(key, adapter, writtenAt + 6 * 24 * 60 * 60 * 1000), ["32877652", "30697905"]);
  assert.equal(await readResultCache(key, adapter, writtenAt + 8 * 24 * 60 * 60 * 1000), null);
});
