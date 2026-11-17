export const HIGH_LEVEL_EVIDENCE_FILTER =
  '(systematic[sb] OR "Meta-Analysis"[Publication Type] OR "Practice Guideline"[Publication Type] OR "Guideline"[Publication Type])';

const HIGH_LEVEL_PUBLICATION_TYPES = new Set([
  "systematic review",
  "meta-analysis",
  "practice guideline",
  "guideline",
]);

export function isHighLevelPublication(types: string[]) {
  return types.some((type) => HIGH_LEVEL_PUBLICATION_TYPES.has(type.trim().toLowerCase().replace(/\s+/g, " ")));
}

/** A JAMA-style "A Review" stays a review even when PubMed also tags a cited meta-analysis. */
export function displayPublicationType(publicationTypes: string[], title = "") {
  const narrativeReview = /\ba review\b/i.test(title) && !/meta-analysis|systematic review/i.test(title);
  if (narrativeReview && publicationTypes.includes("Review")) return "Revisão";
  if (publicationTypes.includes("Meta-Analysis")) return "Meta-análise";
  if (publicationTypes.includes("Systematic Review")) return "Revisão sistemática";
  if (publicationTypes.includes("Randomized Controlled Trial")) return "Ensaio clínico randomizado";
  if (publicationTypes.includes("Clinical Trial")) return "Ensaio clínico";
  if (publicationTypes.includes("Practice Guideline") || publicationTypes.includes("Guideline")) return "Diretriz";
  if (publicationTypes.includes("Review")) return "Revisão";
  return "Artigo científico";
}
