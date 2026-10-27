import {
  collection,
  endocrinologyCollection,
  generalTopics,
  normalized,
  specialtyTopicSets,
  topics,
  translations,
  type Article,
  type BrazilianGuideline,
} from "@/lib/catalog";

import { guidelinesForSpecialty } from "@/data/catalogo";
import { societyById, societyForSpecialty } from "@/data/catalogo/societies";

const QUERY_STOP_WORDS = new Set([
  "e",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "and",
  "the",
  "of",
]);

export function guidelineSourceFor(specialty: string): string {
  return societyForSpecialty(specialty)?.id || "local";
}

export function guidelineTopicsOf(guideline: BrazilianGuideline) {
  return guideline.topics || [guideline.topic];
}

function matchesLocalArticle(article: Article, query: string, topic: string, type: string, period: string) {
  const needle = translations[normalized(query)] || normalized(query);
  // Period filter is relative to wall clock on the client; Date.now is intentional here.
  const periodCutoff = Date.now() - Number(period) * 86400000;
  const typeMatches =
    type === "all" ||
    (type === "trial" && ["Ensaio clínico", "Ensaio clínico randomizado"].includes(article.type)) ||
    (type === "rct" && article.type === "Ensaio clínico randomizado") ||
    (type === "review" && ["Revisão", "Revisão sistemática"].includes(article.type)) ||
    (type === "systematic" && article.type === "Revisão sistemática") ||
    (type === "meta" && article.type === "Meta-análise") ||
    (type === "guideline" && article.type === "Diretriz");
  return (
    (!needle || normalized(`${article.title} ${article.authors} ${article.journal} ${article.id}`).includes(needle)) &&
    (topic === "all" || article.topic === topic) &&
    typeMatches &&
    (period === "all" || Date.parse(article.date) >= periodCutoff)
  );
}

export function guidelineToArticle(guideline: BrazilianGuideline, source: string): Article {
  return {
    id: guideline.id,
    title: guideline.title,
    journal: guideline.journal || (source === "SBEM" ? "Archives of Endocrinology and Metabolism" : source === "SBC" ? "Arquivos Brasileiros de Cardiologia" : "Publicação da sociedade"),
    date: String(guideline.year),
    authors: guideline.authorship || societyById(source)?.name || source,
    type: guideline.kind,
    topic: guideline.topic,
    url: guideline.url,
    source: guideline.provenance.society,
    language: guideline.language,
    year: guideline.year,
  };
}

export type BrowseModelInput = {
  specialty: string;
  tab: string;
  query: string;
  topic: string;
  type: string;
  period: string;
  guidelineYear: string;
  free: boolean;
  sort: string;
  articles: Article[];
  saved: Article[];
};

export function browseModel(input: BrowseModelInput) {
  const guidelineSource = guidelineSourceFor(input.specialty);
  const society = societyForSpecialty(input.specialty);
  const hasBrazilianCatalog = Boolean(society);
  const hasClassics = input.specialty === "cardiology" || input.specialty === "endocrinology";
  const activeGuidelines = guidelinesForSpecialty(input.specialty);
  const activeTopics = specialtyTopicSets[input.specialty] || generalTopics;
  const activeCollection = input.specialty === "endocrinology" ? endocrinologyCollection : collection;
  const shown =
    input.tab === "live"
      ? input.articles
      : [...(input.tab === "saved" ? input.saved : activeCollection)]
          .filter((article) => matchesLocalArticle(article, input.query, input.topic, input.type, input.period))
          .sort((a, b) => (input.sort === "recent" ? Date.parse(b.date) - Date.parse(a.date) : 0));
  const sbcTopicCounts = activeGuidelines.reduce<Record<string, number>>((counts, guideline) => {
    for (const key of guidelineTopicsOf(guideline)) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { all: activeGuidelines.length });
  const guidelineTopics = [...activeTopics, ...topics.filter(([key]) => !activeTopics.some(([value]) => value === key) && (sbcTopicCounts[key] || 0) > 0)];
  const sbcVisibleTopics = (input.tab === "sbc" ? guidelineTopics : activeTopics).filter(([value]) => input.tab !== "sbc" || value === "all" || (sbcTopicCounts[value] || 0) > 0);
  const sbcKinds = Array.from(new Set(activeGuidelines.map((guideline) => guideline.kind))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const sbcYears = Array.from(new Set(activeGuidelines.map((guideline) => guideline.year))).sort((a, b) => b - a);
  const sbcMatches = activeGuidelines
    .filter((guideline) => {
      const needle = normalized(input.query);
      const terms = needle
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .filter((term) => !QUERY_STOP_WORDS.has(term));
      const topicNames = guidelineTopicsOf(guideline).map((key) => topics.find(([value]) => value === key)?.[1] || key);
      const words = normalized([guideline.title, guideline.kind, String(guideline.year), guideline.scope || "", ...topicNames].join(" "))
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const matchesQuery = terms.every((term) => words.some((word) => word === term || (term.length >= 4 && word.startsWith(term))));
      return (
        matchesQuery &&
        (input.topic === "all" || guidelineTopicsOf(guideline).includes(input.topic)) &&
        (input.type === "all" || guideline.kind === input.type) &&
        (input.guidelineYear === "all" || String(guideline.year) === input.guidelineYear)
      );
    })
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const activeFilters =
    (input.topic !== "all" ? 1 : 0) +
    (input.type !== "all" ? 1 : 0) +
    (input.tab === "sbc" ? (input.guidelineYear !== "all" ? 1 : 0) : input.period !== "all" ? 1 : 0) +
    (input.free ? 1 : 0);
  return {
    guidelineSource,
    society,
    societyLabel: society?.abbreviation || "Sociedade",
    hasBrazilianCatalog,
    hasClassics,
    activeGuidelines,
    activeTopics,
    activeCollection,
    shown,
    sbcTopicCounts,
    sbcVisibleTopics,
    sbcKinds,
    sbcYears,
    sbcMatches,
    activeFilters,
  };
}

export type BrowseModel = ReturnType<typeof browseModel>;

