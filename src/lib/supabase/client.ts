import { createBrowserClient } from '@supabase/ssr';

// SECURITY: No hardcoded fallback keys. Environment variables are required.
// If missing, the app will show a clear error rather than silently using stale keys.
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyRaw =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrlRaw) {
  console.error('[FATAL] NEXT_PUBLIC_SUPABASE_URL is not set. Supabase client cannot be initialized.');
}
if (!supabaseAnonKeyRaw) {
  console.error('[FATAL] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase client cannot be initialized.');
}

export const supabaseUrl = supabaseUrlRaw || '';
export const supabaseAnonKey = supabaseAnonKeyRaw || '';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
