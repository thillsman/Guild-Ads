import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@guild-ads/shared'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this for server-side queries where the user is already authenticated via getAuthUser()
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Get user from auth cookie (workaround for @supabase/ssr parsing issues)
 */
export async function getAuthUser() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('sb-pajbapyjgpulakxvzswi-auth-token')

  if (!authCookie?.value) {
    return null
  }

  try {
    const session = JSON.parse(authCookie.value)
    if (session.access_token && session.user) {
      return session.user as {
        id: string
        email: string
        [key: string]: unknown
      }
    }
  } catch {
    return null
  }

  return null
}
