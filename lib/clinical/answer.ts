import type { ClinicalAi, EvidenceRecord } from "./types";
import { selectForSynthesis } from "./select";
import { fallbackSearchTerms, isContextConcept, pairQueries, parseJsonObject, sanitizeConcepts, saoPauloPublicationDay, searchAttempts } from "./terms";
import { insufficientAnswer, validateSynthesis } from "./validate";

function uniqueRecords(articles: EvidenceRecord[]) {
  const byId = new Map<string, EvidenceRecord>();
  for (const article of articles) {
    if (!byId.has(article.pmid)) byId.set(article.pmid, article);
  }
  return [...byId.values()];
}

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
  const today = saoPauloPublicationDay();
  const attempts = searchAttempts(concepts, today);
  const main = concepts.find((concept) => !isContextConcept(concept)) || concepts[0];
  let records: EvidenceRecord[] = [];
  const pooled: EvidenceRecord[] = [];
  for (const term of pairQueries(concepts, today)) {
    pooled.push(...await input.search(term));
  }
  records = selectForSynthesis(uniqueRecords(pooled), main, 6);
  if (!records.length) {
    for (const term of attempts) {
      const found = await input.search(term);
      const selected = selectForSynthesis(found, main, 6);
      if (selected.length) {
        records = selected;
        break;
      }
    }
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
