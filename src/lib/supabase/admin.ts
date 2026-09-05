import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS, so it is used ONLY in trusted
 * server contexts that must read across users — Web Push delivery (reading every
 * recipient's push subscription) and the renewal cron (no user session at all).
 *
 * NEVER import this into client components or expose the key. Returns null when
 * the service role key isn't configured, so callers degrade gracefully (push
 * simply doesn't send) instead of crashing.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
