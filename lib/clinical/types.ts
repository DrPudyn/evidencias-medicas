export type EvidenceLevel = "alto" | "moderado" | "baixo" | "insuficiente";

export type EvidenceRecord = {
  pmid: string;
  title: string;
  journal: string;
  date: string;
  authors: string;
  type: string;
  doi?: string;
  url: string;
  abstract: string;
};

export type ClinicalClaim = { text: string; pmids: string[] };

export type ClinicalReference = {
  pmid: string;
  title: string;
  journal: string;
  date: string;
  type: string;
  doi?: string;
  url: string;
};

export type ClinicalAnswer = {
  sufficient: boolean;
  conclusion: string;
  level: EvidenceLevel;
  levelReason: string;
  limitations: string[];
  claims: ClinicalClaim[];
  references: ClinicalReference[];
  retrieved: ClinicalReference[];
  discardedCitations: string[];
  retrievedCount: number;
  searchTerms: string[];
  disclaimer: string;
};

export type ClinicalAi = {
  searchTerms(question: string): Promise<string>;
  summarize(question: string, records: EvidenceRecord[]): Promise<string>;
};

export const CLINICAL_DISCLAIMER =
  "Este texto não substitui o julgamento clínico. Ele só organiza o que veio nos títulos, resumos e metadados recuperados nesta busca no PubMed. Não é uma avaliação GRADE formal nem uma recomendação de conduta.";
