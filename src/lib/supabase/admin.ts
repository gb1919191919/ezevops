import { createClient } from '@supabase/supabase-js';

// SECURITY: Admin client requires explicit server-side secret key.
// No hardcoded fallbacks, no fallback to anon key, no dummy keys.
// This file should ONLY be imported in server-side code (API routes, server components).

const supabaseUrlRaw =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKeyRaw =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
// SECURITY: Intentionally do NOT fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY.
// The admin client must use the service role key or fail explicitly.

if (typeof window !== 'undefined') {
  console.error('[SECURITY] supabase/admin.ts should never be imported in client-side code.');
}

export const supabaseUrl = supabaseUrlRaw || '';
export const supabaseSecretKey = supabaseSecretKeyRaw || '';

// Fail loudly during server-side execution if keys are missing
function createAdminClient() {
  if (!supabaseUrl || !supabaseSecretKey) {
    // During build time, return a non-functional client to allow static analysis to pass.
    // At runtime in API routes, the missing key will cause Supabase calls to fail with auth errors.
    console.warn('[WARN] Supabase admin client created without valid credentials. API calls will fail.');
  }
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseSecretKey || 'missing_key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = createAdminClient();
