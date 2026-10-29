import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("Use uma senha de 12 a 128 caracteres.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string | null) {
  const match = encoded?.match(/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Equal work for unknown accounts and existing accounts without a password.
  const salt = match?.[1] ?? "00000000000000000000000000000000";
  const expected = Buffer.from(match?.[2] ?? "00".repeat(64), "hex");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected) && Boolean(match);
}
