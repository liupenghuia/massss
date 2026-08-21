export type ApiError = { code: string; message: string; details?: Record<string, unknown> };

// 携带服务端 code/details 的错误，供调用方按需读取结构化信息（如 PUBLISH_PRECONDITION_FAILED 的
// missingCoreFields），而不只是展示笼统的 message 文案。
export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  constructor(err: ApiError) {
    super(err.message || err.code);
    this.code = err.code;
    this.details = err.details ?? {};
  }
}

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
    throw new ApiRequestError(body as ApiError);
  }
  return body as T;
}
