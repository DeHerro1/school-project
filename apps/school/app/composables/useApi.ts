import { useFirebaseAuth } from "./useFirebase";

/**
 * API client — calls this app's own Nuxt server routes (server/api/**),
 * attaching the current Firebase user's ID token as a bearer token. Same
 * call signature as before (`api<T>(path, { method, body })`), so no
 * page/composable needed to change.
 */
export function useApi() {
  async function api<T = any>(
    request: string,
    options?: { method?: string; body?: any },
  ): Promise<T> {
    const user = useFirebaseAuth().currentUser;
    const token = user ? await user.getIdToken() : undefined;
    // `$fetch` itself is cast to `any` here: with dozens of typed
    // server/api/** routes, letting it infer a response type against the
    // literal `request: string` (and its request/options overloads) blows
    // TS's comparison-depth limit (TS2321) for no real benefit — every call
    // site already pins its own response type via `api<T>(...)`.
    return (await ($fetch as any)(request, {
      baseURL: "/api",
      method: (options?.method as any) ?? "GET",
      body: options?.body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })) as T;
  }

  return api;
}

/**
 * Extract a friendly message from an API error.
 *
 * `httpError()`/`parseOrThrow()` (server/utils/http.ts) throw
 * `createError({ data: { error, issues? } })`, but Nitro's default error
 * handler wraps that in its own envelope before it reaches the client — the
 * response body is actually `{ error: true, message, statusMessage, data:
 * <our data>, ... }` (that top-level `error` is a boolean Nitro/Nuxt adds
 * itself, not ours). ofetch's `FetchError.data` is that whole body, so our
 * payload lives at `err.data.data`, one level deeper than it looks — reading
 * `err.data.error` instead picked up Nitro's own `error: true` boolean,
 * which is why a failed request used to show a toast that just said "true".
 */
export function apiError(e: unknown): string {
  const err = e as {
    data?: { message?: string; data?: { error?: string; issues?: { message: string }[] } };
  };
  const firstIssue = err?.data?.data?.issues?.[0];
  if (firstIssue) return firstIssue.message;
  if (err?.data?.data?.error) return err.data.data.error;
  if (err?.data?.message) return err.data.message;
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong. Please try again.";
}

/**
 * Per-field validation errors from a failed request, keyed by field path
 * (e.g. `{ password: "String must contain at least 6 character(s)" }`) —
 * present only for the 422 responses `validateBody()`/`parseOrThrow()`
 * (server/utils/http.ts) throw on a Zod validation failure. `null` for any
 * other kind of error (network error, 401/403/404/409, etc.) — callers
 * should fall back to a general message via `apiError()` in that case, e.g.:
 *
 *   const fields = apiFieldErrors(e);
 *   if (fields) fieldErrors.value = fields;
 *   else toast({ title: "Failed", description: apiError(e), variant: "destructive" });
 */
export function apiFieldErrors(e: unknown): Record<string, string> | null {
  const err = e as { data?: { data?: { issues?: { path: string; message: string }[] } } };
  const issues = err?.data?.data?.issues;
  if (!issues?.length) return null;
  const map: Record<string, string> = {};
  for (const issue of issues) map[issue.path] = issue.message;
  return map;
}
