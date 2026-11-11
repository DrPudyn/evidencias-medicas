import { HIGH_LEVEL_EVIDENCE_FILTER } from "../evidence-filter";

const STOP = new Set([
  "para", "como", "qual", "quais", "sobre", "entre", "essa", "esse", "esta", "este", "uma", "com",
  "dos", "das", "que", "por", "mais", "menos", "existe", "existem", "devo", "usar", "uso", "paciente",
  "pacientes", "clinico", "clinica", "pergunta", "tratamento", "melhor", "conduta", "evidencia",
  "evidencias", "revisao", "diretriz", "estudo", "estudos", "sobre", "quando", "onde", "porque",
  "adultos", "adulto", "criancas", "idade", "anos",
]);

const PT_EN: Array<[string, string]> = [
  ["insuficiência cardíaca", "heart failure"],
  ["insuficiencia cardiaca", "heart failure"],
  ["diabetes tipo 2", "type 2 diabetes"],
  ["diabetes tipo 1", "type 1 diabetes"],
  ["câncer de mama", "breast cancer"],
  ["cancer de mama", "breast cancer"],
  ["dor lombar", "low back pain"],
  ["hipertensão", "hypertension"],
  ["hipertensao", "hypertension"],
  ["metformina", "metformin"],
  ["empagliflozina", "empagliflozin"],
  ["dapagliflozina", "dapagliflozin"],
  ["semaglutida", "semaglutide"],
  ["atorvastatina", "atorvastatin"],
  ["losartana", "losartan"],
  ["amoxicilina", "amoxicillin"],
  ["ibuprofeno", "ibuprofen"],
  ["omeprazol", "omeprazole"],
  ["sertralina", "sertraline"],
  ["anticoagulação", "anticoagulation"],
  ["anticoagulacao", "anticoagulation"],
  ["gravidez", "pregnancy"],
  ["gestação", "pregnancy"],
  ["gestacao", "pregnancy"],
  ["obesidade", "obesity"],
  ["osteoporose", "osteoporosis"],
  ["tireoide", "thyroid"],
  ["depressão", "depression"],
  ["depressao", "depression"],
  ["ansiedade", "anxiety"],
  ["enxaqueca", "migraine"],
  ["pneumonia", "pneumonia"],
  ["sepse", "sepsis"],
  ["asma", "asthma"],
  ["diabetes", "diabetes"],
  ["estatina", "statin"],
  ["aspirina", "aspirin"],
  ["vacina", "vaccine"],
  ["antibiótico", "antibiotic"],
  ["antibiotico", "antibiotic"],
  ["covid", "COVID-19"],
  ["dpoc", "COPD"],
  ["câncer", "cancer"],
  ["cancer", "cancer"],
];

function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function sanitizeTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const terms: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const clean = item
      .replace(/[\[\]"]/g, " ")
      .replace(/\b(AND|OR|NOT)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length < 2 || clean.length > 80) continue;
    if (!/^[\p{L}\p{N} .,'’+/-]+$/u.test(clean)) continue;
    terms.push(clean.toLowerCase());
    if (terms.length === 6) break;
  }
  return [...new Set(terms)];
}

export function fallbackSearchTerms(question: string): string[] {
  const folded = fold(question);
  const pairs = [...PT_EN].sort((a, b) => fold(b[0]).length - fold(a[0]).length);
  let rest = ` ${folded} `;
  const found: string[] = [];
  for (const [source, target] of pairs) {
    const key = fold(source);
    if (rest.includes(key)) {
      found.push(target.toLowerCase());
      rest = rest.replaceAll(key, " ");
    }
  }
  if (!found.length) {
    for (const word of rest.split(/[^a-z0-9+-]+/).filter((item) => item.length >= 5 && !STOP.has(item))) {
      if (found.length >= 6) break;
      found.push(word);
    }
  }
  return [...new Set(found)].slice(0, 6);
}

export function evidenceQuery(terms: string[]): string {
  const parts = terms.map((term) => {
    const quoted = `"${term.replace(/"/g, "")}"`;
    return `(${quoted}[Title/Abstract] OR ${quoted}[MeSH Terms])`;
  });
  return `${parts.join(" AND ")} AND ${HIGH_LEVEL_EVIDENCE_FILTER}`;
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
