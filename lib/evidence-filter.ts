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
