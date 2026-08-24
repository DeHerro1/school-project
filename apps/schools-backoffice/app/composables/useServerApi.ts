import { useFirebaseAuth } from "./useFirebase";

/**
 * Calls this app's own Nuxt server routes (server/api/**) — the real,
 * Firestore-backed half of this app — attaching the signed-in platform
 * admin's Firebase ID token as a bearer token. Same shape as apps/school's
 * useApi(). Everything else here (schools CRUD) still goes through the
 * front-end-only mock in useApi.ts; see that file's comment for why.
 */
export function useServerApi() {
  async function api<T = any>(
    request: string,
    options?: { method?: string; body?: any },
  ): Promise<T> {
    const user = useFirebaseAuth().currentUser;
    const token = user ? await user.getIdToken() : undefined;
    // `$fetch` cast to `any`: letting it infer a response type against a
    // template-literal URL blows TS's comparison-depth limit (TS2321) — same
    // workaround as apps/school's useApi().
    return (await ($fetch as any)(request, {
      baseURL: "/api",
      method: (options?.method as any) ?? "GET",
      body: options?.body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })) as T;
  }

  return api;
}
