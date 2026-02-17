import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@guild-ads/shared'

type TypedSupabaseClient = SupabaseClient<Database>

interface AuthUser {
  id: string
  email: string
}

export async function createClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

  // createServerClient currently infers `never` table rows with our generated Database type.
  // Cast to the standard SupabaseClient type so query result types remain usable.
  return client as unknown as TypedSupabaseClient
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
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (data.user) {
    return {
      id: data.user.id,
      email: data.user.email ?? '',
    }
  }

  // Fallback for environments where auth cookies are stale or malformed.
  const cookieStore = await cookies()
  const authCookie = cookieStore
    .getAll()
    .find((cookie) => cookie.name.endsWith('-auth-token'))

  if (authCookie?.value) {
    try {
      const decoded = decodeURIComponent(authCookie.value)
      const session = JSON.parse(decoded)

      if (session?.access_token && session?.user) {
        const fallbackUser = session.user as User
        return {
          id: fallbackUser.id,
          email: fallbackUser.email ?? '',
        }
      }
    } catch {
      // ignore fallback parse errors
    }
  }

  return null
}
