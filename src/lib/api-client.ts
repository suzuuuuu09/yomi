export interface ApiClientErrorOptions {
  status: number;
  code: string;
  issues?: unknown;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: unknown;

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.issues = options.issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  parse?: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = await readPayload(response);

  if (!response.ok) {
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    const code =
      error && typeof error.code === "string" ? error.code : "HTTP_ERROR";
    const message =
      error && typeof error.message === "string"
        ? error.message
        : `APIリクエストに失敗しました (${response.status})`;
    throw new ApiClientError(message, {
      status: response.status,
      code,
      issues: error?.issues,
    });
  }

  if (!parse) return payload as T;

  try {
    return parse(payload);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError("APIの応答形式が不正です", {
      status: response.status,
      code: "INVALID_RESPONSE",
    });
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}
