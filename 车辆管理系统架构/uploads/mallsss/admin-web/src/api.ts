export type ApiError = { code: string; message: string };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  if (res.status === 204 || (res.status === 200 && res.headers.get("content-length") === "0")) {
    return undefined as T;
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(err.message || err.code || res.statusText);
  }
  return body as T;
}
