import { ACCESS_BLOCKED, responseIsBlocked } from "@/lib/api-guard";

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
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
