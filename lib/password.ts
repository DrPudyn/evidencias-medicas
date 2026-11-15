import { scrypt, timingSafeEqual } from "node:crypto";

const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const PBKDF2_ITERATIONS = 210_000;

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function deriveScrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, scryptOptions, (error, key) => error ? reject(error) : resolve(key)));
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("Use uma senha de 12 a 128 caracteres.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${hex(salt)}$${hex(key)}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  const pbkdf = encoded?.match(/^pbkdf2-sha256\$(\d+)\$([a-f0-9]{32})\$([a-f0-9]{64})$/);
  if (pbkdf) {
    const iterations = Number(pbkdf[1]);
    const actual = await derivePbkdf2(password, fromHex(pbkdf[2]), iterations);
    const expected = fromHex(pbkdf[3]);
    return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }
  const legacy = encoded?.match(/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  const salt = legacy?.[1] ?? "00000000000000000000000000000000";
  const expected = Buffer.from(legacy?.[2] ?? "00".repeat(64), "hex");
  try {
    const actual = await deriveScrypt(password, salt);
    return timingSafeEqual(actual, expected) && Boolean(legacy);
  } catch {
    return false;
  }
}
