import { z } from "zod";

export const readingSchema = z.object({
  folder: z.string().trim().max(80).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  notes: z.string().max(10000).default(""),
  status: z.enum(["later", "reading", "read"]).default("later"),
});
export type Reading = z.infer<typeof readingSchema>;
export const emptyReading: Reading = { folder: "", tags: [], notes: "", status: "later" };
export const searchSchema = z.object({
  q: z.string().trim().max(200), specialty: z.string().max(80), topic: z.string().max(80),
  type: z.string().max(80), period: z.enum(["all", "30", "365", "1825"]),
  free: z.boolean(), sort: z.enum(["recent", "relevance"]),
});
export type SavedQuery = z.infer<typeof searchSchema>;
export type SavedSearch = { id: string; name: string; query: SavedQuery; checkedAt: number; seenIds: string[] };
export const clinicalFields = {
  question: "Pergunta clínica", population: "População", intervention: "Intervenção / exposição",
  comparator: "Comparador", results: "Resultados e medidas de efeito", limitations: "Limitações",
  applicability: "Aplicabilidade", references: "Referências e páginas do texto completo",
};
export const editorialSchema = z.object({
  articleId: z.string().min(1).max(100), source: z.string().max(100),
  title: z.string().trim().min(1).max(1500), sourceUrl: z.string().url().max(2000).refine(v => v.startsWith("https://")),
  status: z.enum(["draft", "published", "withdrawn"]), reviewer: z.string().trim().max(200),
  fullTextReviewed: z.boolean(), supersededBy: z.string().max(100),
  question: z.string().max(5000), population: z.string().max(5000), intervention: z.string().max(5000),
  comparator: z.string().max(5000), results: z.string().max(5000), limitations: z.string().max(5000),
  applicability: z.string().max(5000), references: z.string().max(5000),
});
export type Editorial = z.infer<typeof editorialSchema> & { id: string; createdAt: number };
