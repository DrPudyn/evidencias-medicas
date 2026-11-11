import type { ClinicalAi, EvidenceRecord } from "./types";
import { evidenceQuery, fallbackSearchTerms, parseJsonObject, sanitizeTerms } from "./terms";
import { insufficientAnswer, validateSynthesis } from "./validate";

export async function answerClinicalQuestion(input: {
  question: string;
  ai: ClinicalAi;
  search: (term: string) => Promise<EvidenceRecord[]>;
}) {
  const question = input.question.trim();
  let terms: string[] = [];
  try {
    const raw = await input.ai.searchTerms(question);
    terms = sanitizeTerms(parseJsonObject(raw)?.terms);
  } catch {
    terms = [];
  }
  if (!terms.length) terms = fallbackSearchTerms(question);
  if (!terms.length) {
    return insufficientAnswer(
      "Não foi possível montar uma busca no PubMed a partir desta pergunta. Nenhuma conclusão foi completada com conhecimento geral.",
      [],
      [],
      [],
    );
  }
  const records = await input.search(evidenceQuery(terms));
  if (!records.length) {
    return insufficientAnswer(
      "Não encontramos revisões sistemáticas, metanálises ou diretrizes no PubMed para esta pergunta. Não há conclusão clínica a partir desta busca.",
      [],
      [],
      terms,
    );
  }
  try {
    const raw = await input.ai.summarize(question, records);
    return validateSynthesis(raw, records, terms);
  } catch {
    return insufficientAnswer(
      "A busca recuperou registros, mas a síntese falhou. Nenhuma conclusão foi produzida.",
      records,
      [],
      terms,
    );
  }
}
