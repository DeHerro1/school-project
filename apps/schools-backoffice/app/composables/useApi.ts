import { useAuthStore } from "~/stores/auth";
import { handleMockRequest } from "@repo/shared";

/**
 * Front-end-only API client — for schools CRUD only (`/schools*`).
 *
 * Instead of calling a backend over HTTP, every request is routed to an
 * in-memory mock (see `@repo/shared` → mock.ts) so this part of the app runs
 * with no server and no database. Login and admin management
 * (server/api/platform-admins/**) are real (see useAuth.ts /
 * usePlatformAdminsApi.ts) — this composable just forwards the now-real,
 * Firebase-verified admin identity into the mock via `isPlatformAdmin`, so
 * `needPlatform()` there trusts it without also knowing about the mock's own
 * seeded admin table.
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
    const sessionUser = auth.admin
      ? { id: auth.admin.id, name: auth.admin.name, email: auth.admin.email, isPlatformAdmin: true }
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
