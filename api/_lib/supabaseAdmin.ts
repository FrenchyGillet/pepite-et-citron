import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for serverless functions.
 * Bypasses RLS — never expose its results without an explicit ownership check.
 * Files under api/_lib are shared helpers, not routes (Vercel ignores the `_` prefix).
 */
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
