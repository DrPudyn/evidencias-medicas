import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { answerClinicalQuestion } from "./answer";
import { fallbackSearchTerms } from "./terms";
import { createClinicalAi, createWorkersAi } from "./provider";
import { quotaMessage, releaseClinicalQuota, reserveClinicalQuota } from "./quota";
import type { ClinicalAi, EvidenceRecord } from "./types";

const record = (pmid: string, type = "Meta-análise"): EvidenceRecord => ({
  pmid,
  title: `Título ${pmid}`,
  journal: "Journal",
  date: "2024",
  authors: "Alguém",
  type,
  doi: `10.1000/test.${pmid}`,
  url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  abstract: `Resumo recuperado do PMID ${pmid}. Redução relatada no abstract.`,
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

test("pergunta clínica normal cita só PMIDs recuperados", async () => {
  const records = [record("12345678"), record("87654321", "Revisão sistemática")];
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
    search: async () => [record("12345678")],
  });
  assert.equal(answer.sufficient, false);
  assert.equal(answer.references.length, 0);
  assert.ok(answer.discardedCitations.includes("99999999"));
  assert.match(answer.answer, /Nenhuma conclusão/);
  assert.doesNotMatch(answer.answer, /sempre interne|Conduta geral|99999999/);
});

test("citação inválida sai do texto e a válida é renumerada", async () => {
  const ai: ClinicalAi = {
    async searchTerms() {
      return JSON.stringify({ terms: ["diabetes"] });
    },
    async summarize() {
      return JSON.stringify({
        sufficient: true,
        answer: "Fonte externa [1]. A revisão recuperada descreve redução [2].",
        citations: ["99999999", "12345678"],
      });
    },
  };
  const answer = await answerClinicalQuestion({
    question: "A metformina reduz eventos no diabetes?",
    ai,
    search: async () => [record("12345678")],
  });
  assert.equal(answer.sufficient, true);
  assert.match(answer.answer, /\[1\]/);
  assert.doesNotMatch(answer.answer, /\[2\]|Fonte externa|99999999/);
  assert.deepEqual(answer.references.map((item) => ({ n: item.n, pmid: item.pmid, url: item.url })), [{
    n: 1,
    pmid: "12345678",
    url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  }]);
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

test("provedor fixture só na prévia e Workers AI lê o texto do binding", async () => {
  assert.equal(createClinicalAi({ CLINICAL_AI_PROVIDER: "fixture" }), null);
  assert.equal(createClinicalAi({}), null);
  assert.ok(createClinicalAi({ CLINICAL_AI_PROVIDER: "fixture", LOCAL_PREVIEW_ENABLED: "true" }));
  const ai = createWorkersAi({
    async run() {
      return { response: "{\"terms\":[\"asthma\"]}" };
    },
  });
  assert.match(await ai.searchTerms("asma"), /asthma/);
});
