import { ACCESS_BLOCKED, responseIsBlocked } from "@/lib/api-guard";

const REQUEST_TIMEOUT_MS = 20_000;

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (method === "GET" || method === "HEAD") headers.delete("Content-Type");
  else if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal && typeof AbortSignal.any === "function"
    ? AbortSignal.any([options.signal, timeout])
    : options.signal ?? timeout;
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      method,
      credentials: options.credentials ?? "include",
      headers,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Não foi possível concluir. Tente novamente.");
  }
  if (responseIsBlocked(response.headers.get("content-type"), response.redirected)) {
    throw new Error(ACCESS_BLOCKED);
  }
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir. Tente novamente.");
  }
  return data;
}
