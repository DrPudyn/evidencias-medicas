import { z } from "zod";

const text = z.string().min(1);
const httpUrl = z.string().url().refine((value) => /^https?:\/\//.test(value), "Expected HTTP(S) URL");
const calendarDate = z.string().date();
// Legacy records only establish a publication year. Never invent a month/day.
const publicationDate = z.union([z.string().regex(/^\d{4}$/), calendarDate]);

export const guidelineSchema = z.object({
  id: text,
  title: text,
  year: z.number().int().min(1000).max(9999),
  topic: text,
  topics: z.array(text).nonempty().optional(),
  kind: text,
  url: httpUrl,
  scope: text.optional(),
  authorship: text.optional(),
  provenance: z.object({
    society: z.enum(["SBC", "SBEM"]),
    originalUrl: httpUrl,
    publishedDate: publicationDate,
    lastReviewedAt: calendarDate.nullable(),
    catalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  }).strict(),
}).strict().superRefine((item, ctx) => {
  if (item.url !== item.provenance.originalUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["provenance", "originalUrl"], message: "Original URL must match the document URL" });
  }
  if (String(item.year) !== item.provenance.publishedDate.slice(0, 4)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["provenance", "publishedDate"], message: "Publication date must match the document year" });
  }
});

export const catalogSchema = z.array(guidelineSchema).nonempty().superRefine((items, ctx) => {
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "id"], message: "Duplicate catalog ID" });
    ids.add(item.id);
    if (item.provenance.society !== items[0].provenance.society || item.provenance.catalogVersion !== items[0].provenance.catalogVersion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "provenance"], message: "Catalog society and version must be consistent" });
    }
  }
});

export type CatalogGuideline = z.infer<typeof guidelineSchema>;
