import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';


/**
 * Server-only Supabase admin client using the service role key.
 * Invariant: Never use or import this in client-side code.
 * Strictly reserved for user provisioning/deactivation on the server.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client cannot be instantiated in the browser.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
