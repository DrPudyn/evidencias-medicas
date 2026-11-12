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
  /** Position in the PubMed relevance list. Lower is more relevant. */
  relevance?: number;
  /** How many parallel queries returned this PMID. */
  hits?: number;
};

export type ClinicalReference = {
  n: number;
  pmid: string;
  title: string;
  url: string;
  type?: string;
};

export type ClinicalAnswer = {
  sufficient: boolean;
  answer: string;
  references: ClinicalReference[];
  discardedCitations: string[];
  disclaimer: string;
};

export type ClinicalSearchOptions = {
  sort?: "relevance" | "pub_date";
  kind?: "high-level" | "guideline" | "meta";
  includeTrials?: boolean;
};

export type SourcePair = { pmid: string; fonte: string };
export type VerdictPair = { pmid: string; texto: string; fonte: string };

export type ClinicalAi = {
  searchTerms(question: string): Promise<string>;
  summarize(question: string, records: EvidenceRecord[], options?: { direct?: boolean }): Promise<string>;
  translate?(question: string, pairs: SourcePair[]): Promise<string>;
  verify?(pairs: VerdictPair[]): Promise<string>;
};

export const CLINICAL_DISCLAIMER =
  "Este texto não substitui o julgamento clínico. Ele só organiza o que veio nos registros recuperados nesta busca no PubMed.";
