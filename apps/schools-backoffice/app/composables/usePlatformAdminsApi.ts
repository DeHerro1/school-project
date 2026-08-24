import { useServerApi } from "./useServerApi";

/** server/api/platform-admins/** — see useServerApi.ts's comment. */
export function usePlatformAdminsApi() {
  const api = useServerApi();
  return <T = any>(request: string, options?: { method?: string; body?: any }) =>
    api<T>(`/platform-admins${request}`, options);
}
