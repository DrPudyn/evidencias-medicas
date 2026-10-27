import { z } from "zod";

const text = z.string().min(1).refine(value => value.trim().length > 0);
const year = z.number().int().min(1900).max(2100);
const provenanceSchema = z.object({
  source: text,
  url: z.string().url(),
  society: text,
  guidelineYear: year,
  // O catálogo legado não registrava datas de acesso. Não inferir uma consulta.
  accessedAt: z.string().date().nullable(),
  accessStatus: z.enum(["recorded", "not-recorded"]),
}).strict().refine(p => (p.accessedAt === null) === (p.accessStatus === "not-recorded"), {
  message: "Data de acesso deve corresponder ao estado de registro",
});

export const guidelineSchema = z.object({
  id: text,
  title: text,
  year,
  topic: text,
  topics: z.array(text).optional(),
  kind: text,
  url: z.string().url(),
  scope: text.optional(),
  authorship: text.optional(),
  societyIds: z.array(text).min(1).optional(),
  journal: text.optional(),
  access: z.literal("free-full-text").optional(),
  language: text.optional(),
  pmid: text.optional(),
  provenance: provenanceSchema,
}).strict().refine(item => item.url === item.provenance.url && item.year === item.provenance.guidelineYear, {
  message: "URL e ano da proveniência devem corresponder ao documento",
}).refine(item => !item.societyIds || item.societyIds.includes(item.provenance.society), {
  message: "A sociedade da proveniência deve participar do documento",
});

export const catalogSchema = z.object({
  catalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  items: z.array(guidelineSchema).min(1),
}).strict();

export type BrazilianGuideline = z.infer<typeof guidelineSchema>;

