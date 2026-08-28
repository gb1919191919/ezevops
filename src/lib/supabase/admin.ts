import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yliozdsnqnfjkpcuctwe.supabase.co';

export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey || 'dummy_key_for_build', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
