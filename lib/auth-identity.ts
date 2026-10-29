export const ADMIN_EMAIL = "evidenciasmedicas@outlook.com";
export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
export function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function accountIdentity(id: string, email: string) {
  return { id, email, name: email.split("@")[0], role: email === ADMIN_EMAIL ? "admin" : "member",
    crm: "", college: "", state: "", phone: "", emailNotifications: false, whatsappNotifications: false };
}
