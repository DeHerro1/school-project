import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Service-role client — full admin privileges (auth.admin.*, Storage writes,
 * Realtime broadcast). Server-side only; the service role key must never
 * reach a browser bundle.
 */
export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Anon-key client — least-privilege, used only for the password-grant login
 * call (signInWithPassword doesn't need admin rights).
 */
export const supabaseAnon = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
