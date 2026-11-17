import entries from "./societies.json";

export const societies = entries;
export type Society = (typeof societies)[number];
export function societyById(id: string) {
  return societies.find(society => society.id === id);
}
export function societyForSpecialty(specialty: string) {
  return societies.find(society => society.specialties.includes(specialty));
}
export function societiesForSpecialty(specialty: string) {
  return societies.filter(society => society.specialties.includes(specialty));
}
