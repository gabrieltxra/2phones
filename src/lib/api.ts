export class ApiError extends Error {
  constructor(public code: string, public statusText: string, public status: number) { super(code); }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers }, ...options });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? "REQUEST_FAILED", response.statusText, response.status);
  return payload;
}
export function track(event: string, locale: string, roomCode?: string) {
  void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, locale, roomCode }), keepalive: true, credentials: "include" });
}
