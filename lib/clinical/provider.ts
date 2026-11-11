import { DEFAULT_AI_MODEL } from "../brand";
import type { ClinicalAi, EvidenceRecord } from "./types";
import { fallbackSearchTerms } from "./terms";
import { SUMMARY_SYSTEM, TERMS_SYSTEM, summaryUser } from "./prompts";

export type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

export type ClinicalAiEnv = {
  AI?: AiBinding;
  WORKERS_AI_MODEL?: string;
  CLINICAL_AI_PROVIDER?: string;
  LOCAL_PREVIEW_ENABLED?: string;
};

function textFrom(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (typeof record.response === "string") return record.response;
    const choices = record.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (typeof content === "string") return content;
    if (typeof record.result === "string") return record.result;
  }
  return "";
}

export function createWorkersAi(ai: AiBinding, model = DEFAULT_AI_MODEL): ClinicalAi {
  async function complete(system: string, user: string, maxTokens: number) {
    const result = await ai.run(model, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    });
    const text = textFrom(result);
    if (!text.trim()) throw new Error("Resposta vazia do provedor de IA.");
    return text;
  }
  return {
    searchTerms(question) {
      return complete(TERMS_SYSTEM, question, 280);
    },
    summarize(question, records) {
      return complete(SUMMARY_SYSTEM, summaryUser(question, records), 400);
    },
  };
}

/** Extrai trechos dos registros. Só existe na prévia local, para demonstrar a UI sem o binding de IA. */
export function createFixtureAi(): ClinicalAi {
  return {
    async searchTerms(question) {
      return JSON.stringify({ terms: fallbackSearchTerms(question) });
    },
    async summarize(_question, records: EvidenceRecord[]) {
      const used = records.slice(0, 3);
      const marks = used.map((_, index) => `[${index + 1}]`).join(" ");
      return JSON.stringify({
        sufficient: used.length > 0,
        answer: used.length
          ? `As revisões recuperadas nesta busca tratam da pergunta feita, e a leitura que sustenta a resposta está nos artigos citados ${marks}.`
          : "",
        citations: used.map((record) => record.pmid),
      });
    },
  };
}

export function createClinicalAi(env: ClinicalAiEnv): ClinicalAi | null {
  const provider = env.CLINICAL_AI_PROVIDER || "workers-ai";
  if (provider === "disabled") return null;
  if (provider === "fixture") {
    return env.LOCAL_PREVIEW_ENABLED === "true" ? createFixtureAi() : null;
  }
  if (!env.AI?.run) return null;
  return createWorkersAi(env.AI, env.WORKERS_AI_MODEL || DEFAULT_AI_MODEL);
}
