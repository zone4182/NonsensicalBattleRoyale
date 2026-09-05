// The client only ever talks to Edge Functions, never Postgres directly
// (ARCHITECTURE.md "Critical architectural rule").
export interface ApiErrorBody {
  error: string;
  message: string;
}

export class ApiCallError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface CallFunctionOptions {
  token?: string;
  extraHeaders?: Record<string, string>;
}

export async function callFunction<T>(name: string, payload: unknown, opts?: CallFunctionOptions): Promise<T> {
  const base = import.meta.env.VITE_FUNCTIONS_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...opts?.extraHeaders };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${base}/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = json as Partial<ApiErrorBody>;
    throw new ApiCallError(body.error ?? "unknown_error", body.message ?? "Request failed", res.status);
  }
  return json as T;
}
