import type { ClinicalAi, EvidenceRecord } from "./types";
import { fallbackSearchTerms, parseJsonObject, sanitizeConcepts, saoPauloPublicationDay, searchAttempts } from "./terms";
import { insufficientAnswer, validateSynthesis } from "./validate";

export async function answerClinicalQuestion(input: {
  question: string;
  ai: ClinicalAi;
  search: (term: string) => Promise<EvidenceRecord[]>;
}) {
  const question = input.question.trim();
  let concepts = [] as ReturnType<typeof sanitizeConcepts>;
  try {
    const raw = await input.ai.searchTerms(question);
    concepts = sanitizeConcepts(parseJsonObject(raw));
  } catch {
    concepts = [];
  }
  if (!concepts.length) concepts = sanitizeConcepts({ terms: fallbackSearchTerms(question) });
  if (!concepts.length) {
    return insufficientAnswer(
      "Não foi possível montar uma busca no PubMed a partir desta pergunta. Nenhuma conclusão foi completada com conhecimento geral.",
    );
  }
  const attempts = searchAttempts(concepts, saoPauloPublicationDay());
  let records: EvidenceRecord[] = [];
  for (const term of attempts) {
    records = await input.search(term);
    if (records.length) break;
  }
  if (!records.length) {
    return insufficientAnswer(
      "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.",
    );
  }
  try {
    const raw = await input.ai.summarize(question, records);
    return validateSynthesis(raw, records);
  } catch {
    return insufficientAnswer(
      "A busca recuperou registros, mas a síntese falhou. Nenhuma conclusão foi produzida.",
    );
  }
}
