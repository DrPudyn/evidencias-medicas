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

export function readAiText(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result !== "object") return "";
  const record = result as Record<string, unknown>;
  if (typeof record.response === "string") return record.response;
  if (record.response && typeof record.response === "object") return JSON.stringify(record.response);
  const choices = record.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") return JSON.stringify(content);
  if (typeof record.result === "string") return record.result;
  if (record.result && typeof record.result === "object") return JSON.stringify(record.result);
  return "";
}

const TERMS_SCHEMA = {
  type: "object",
  properties: {
    concepts: { type: "array", items: { type: "array", items: { type: "string" } } },
  },
  required: ["concepts"],
};

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    sufficient: { type: "boolean" },
    answer: { type: "string" },
    citations: { type: "array", items: { type: "string" } },
  },
  required: ["sufficient", "answer", "citations"],
};

export function createWorkersAi(ai: AiBinding, model = DEFAULT_AI_MODEL): ClinicalAi {
  async function complete(system: string, user: string, maxTokens: number, schema: Record<string, unknown>) {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const base = { messages, max_tokens: maxTokens, temperature: 0.2 };
    try {
      const structured = await ai.run(model, {
        ...base,
        response_format: { type: "json_schema", json_schema: schema },
      });
      const text = readAiText(structured);
      if (text.trim()) return text;
    } catch {
      // JSON mode can fail; the plain call below still has to parse.
    }
    const result = await ai.run(model, base);
    const text = readAiText(result);
    if (!text.trim()) throw new Error("Resposta vazia do provedor de IA.");
    return text;
  }
  return {
    searchTerms(question) {
      return complete(TERMS_SYSTEM, question, 320, TERMS_SCHEMA);
    },
    summarize(question, records) {
      return complete(SUMMARY_SYSTEM, summaryUser(question, records), 700, SUMMARY_SCHEMA);
    },
  };
}

/** Extrai trechos dos registros. Só existe na prévia local, para demonstrar a UI sem o binding de IA. */
export function createFixtureAi(): ClinicalAi {
  return {
    async searchTerms(question) {
      return JSON.stringify({ concepts: fallbackSearchTerms(question).map((term) => [term]) });
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
