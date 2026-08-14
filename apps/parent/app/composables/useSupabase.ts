import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (anon key only — never the service role key).
 * Owns session persistence/auto-refresh itself once a session is handed to
 * it via `setSession()` (see useAuth.ts), so the app doesn't hand-roll token
 * expiry/refresh logic.
 */
export function useSupabase(): SupabaseClient {
  if (!client) {
    const config = useRuntimeConfig();
    client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey);
  }
  return client;
}
