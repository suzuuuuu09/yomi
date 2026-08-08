import type { Context } from "hono";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL_ERROR";

type ApiErrorStatus = 400 | 401 | 404 | 409 | 500 | 502 | 504;

export interface ApiErrorIssue {
  path: (string | number)[];
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ApiErrorIssue[];
  };
}

export function apiError(
  _c: Context,
  status: ApiErrorStatus,
  code: ApiErrorCode,
  message: string,
  issues?: ApiErrorIssue[],
) {
  const error: ApiErrorResponse["error"] = { code, message };
  if (issues && issues.length > 0) error.issues = issues;
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
