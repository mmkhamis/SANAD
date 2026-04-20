// ─── Network error detection ─────────────────────────────────────────
// Identifies errors caused by missing / unstable connectivity,
// distinguishing them from application-level errors (validation, auth, etc.)
// so the offline queue can decide whether to enqueue vs. surface the error.

const NETWORK_ERROR_PATTERNS = [
  /network request failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /net::err_/i,
  /etimedout/i,
  /econnrefused/i,
  /enotfound/i,
  /no internet/i,
  /offline/i,
  /unable to connect/i,
  /connection refused/i,
  /connection reset/i,
  /timeout/i,
  /fetch error/i,
  /aborted/i,
  /socket hang up/i,
];

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;

  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : String(err);

  // Supabase-level abort / fetch failures
  if (message.length === 0) return false;

  return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
