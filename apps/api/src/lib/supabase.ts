import { createClient } from '@supabase/supabase-js'
import type { Database } from '@guild-ads/shared'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

/**
 * Supabase client with service role key for server-side operations.
 * This bypasses RLS - use with caution and validate inputs.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
