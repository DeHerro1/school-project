import { useSupabase } from "./useSupabase";

/**
 * API client — calls the real Express API, attaching the current Supabase
 * session's access token as a bearer token. Same call signature as before
 * (`api<T>(path, { method, body })`), so no page/composable needed to change.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const supabase = useSupabase();

  async function api<T = any>(
    request: string,
    options?: { method?: string; body?: any },
  ): Promise<T> {
    const { data } = await supabase.auth.getSession();
    return await $fetch<T>(request, {
      baseURL: `${config.public.apiBase}/api`,
      method: (options?.method as any) ?? "GET",
      body: options?.body,
      headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : undefined,
    });
  }

  return api;
}

/** Extract a friendly message from an API error. */
export function apiError(e: unknown): string {
  const err = e as { data?: { error?: string; issues?: { message: string }[] } };
  if (err?.data?.error) return err.data.error;
  const firstIssue = err?.data?.issues?.[0];
  if (firstIssue) return firstIssue.message;
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong. Please try again.";
}
