const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return jsonResponse({ error: err.code, message: err.message }, err.status);
  }
  console.error(err);
  return jsonResponse({ error: "internal_error", message: "Something went wrong." }, 500);
}

export function preflightResponse(): Response {
  return new Response("ok", { headers: CORS_HEADERS });
}

export async function readJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}
