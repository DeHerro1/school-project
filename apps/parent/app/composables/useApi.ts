import { useAuthStore } from "~/stores/auth";
import { handleMockRequest } from "@repo/shared";

/**
 * Front-end-only API client.
 *
 * Instead of calling the backend over HTTP, every request is routed to an
 * in-memory mock (see `@repo/shared` → mock.ts) so the whole app runs with no
 * server and no database. The call signature matches the `$fetch` instance this
 * replaced — `api<T>(path, { method, body })` — so no page or composable needed
 * to change.
 *
 * To reconnect a real backend later, restore the `$fetch.create({ baseURL })`
 * version and delete this mock wiring.
 */
export function useApi() {
  const auth = useAuthStore();

  async function api<T = any>(
    request: string,
    options?: { method?: string; body?: any },
  ): Promise<T> {
    const method = options?.method ?? "GET";
    const sessionUser = auth.user
      ? { id: auth.user.id, role: auth.user.role, name: auth.user.name }
      : null;
    // A touch of latency so spinners/loading states behave like a real network.
    await new Promise((r) => setTimeout(r, 60));
    return (await handleMockRequest(method, request, options?.body, sessionUser)) as T;
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
