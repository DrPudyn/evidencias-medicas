import { DEFAULT_PLAN_PRICE_LABEL } from "./brand";

/**
 * Limites diários da pergunta clínica (fuso America/Sao_Paulo).
 * Anônimo: 1 pergunta por dia, chaveada pelo hash do IP, para a home funcionar sem conta.
 * Conta grátis: 3 por dia. Assinante ativo: 40 por dia.
 * O texto da pergunta não é gravado.
 */
export const PLAN_LIMITS = {
  anonymous: 1,
  free: 3,
  subscriber: 40,
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
export const PLAN_PRICE_PERIOD = "/mês";
export const PLAN_PRICE_PROVISIONAL = false;

export function readPlanPriceLabel(raw?: string | null): string {
  const value = (raw || "").trim();
  if (!value || value.length > 40) return DEFAULT_PLAN_PRICE_LABEL;
  return value;
}
