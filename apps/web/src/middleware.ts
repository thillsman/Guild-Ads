import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Workaround: manually check for valid session in cookie
  // @supabase/ssr getSession() has issues parsing the cookie in some cases
  let isAuthenticated = false
  let userEmail: string | null = null

  const authCookie = request.cookies.get('sb-pajbapyjgpulakxvzswi-auth-token')
  if (authCookie?.value) {
    try {
      const session = JSON.parse(authCookie.value)
      if (session.access_token && session.user?.email) {
        isAuthenticated = true
        userEmail = session.user.email
      }
    } catch {
      // Invalid cookie, not authenticated
    }
  }

  // Also try to refresh session via Supabase client (this sets cookies properly)
  if (isAuthenticated) {
    await supabase.auth.getUser()
  }

  // Protected routes - redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === '/login' && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
}
