import sbc from "./sbc.json";
import sbem from "./sbem.json";
import additional from "./additional.json";
import { catalogSchema } from "./schema";
import { societyById, societyForSpecialty } from "./societies";

// Validar antes de disponibilizar os registros aos consumidores existentes.
export const sbcCatalog = catalogSchema.parse(sbc);
export const sbemCatalog = catalogSchema.parse(sbem);
export const additionalCatalog = catalogSchema.parse(additional);
export const allGuidelines = [...sbcCatalog.items, ...sbemCatalog.items, ...additionalCatalog.items];

const ids = new Set<string>();
for (const item of allGuidelines) {
  if (ids.has(item.id)) throw new Error(`Documento duplicado: ${item.id}`);
  ids.add(item.id);
  for (const id of item.societyIds || [item.provenance.society]) {
    if (!societyById(id)) throw new Error(`Sociedade desconhecida: ${id}`);
  }
}

export function guidelinesForSpecialty(specialty: string) {
  const society = societyForSpecialty(specialty);
  if (!society) return [];
  return allGuidelines.filter(item => (item.societyIds || [item.provenance.society]).includes(society.id));
}

// Resolve pelo cadastro confiável; nunca aceitar uma URL enviada pelo cliente.
export function canonicalGuideline(id: string, source: string) {
  return allGuidelines.find(item => item.id === id && item.provenance.society === source);
}

