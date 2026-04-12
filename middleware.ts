import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/verify-otp', '/terms', '/privacy', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow PWA files through without any auth checks
  if (pathname === '/sw.js' || pathname === '/manifest.webmanifest') {
    return NextResponse.next({ request })
  }

  // Let API routes handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route))

  if (isPublicRoute && !['/login', '/signup'].includes(pathname)) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let user = null

  try {
    // ── OPTIMIZED: getSession() instead of getUser() ─────────────────────
    // getSession() validates the JWT from the cookie locally — no network call.
    // getUser() hits the Supabase Auth server on EVERY navigation (200-400ms
    // on Nigerian connections). For route protection this is unnecessary —
    // individual API routes still use getUser() for data-mutating security.
    //
    // Tradeoff: if a session is revoked server-side, the middleware won't catch
    // it until the JWT expires (default 1 hour). This is acceptable for page
    // navigation — the worst case is the user sees the page briefly and then
    // API calls fail with 401.
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch (error) {
    // Network failure or Supabase unreachable — fail open on public routes,
    // redirect to login on protected routes to avoid crashing
    console.error('[Middleware] Supabase getSession failed:', error)

    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next({ request })
  }

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && !user.email_confirmed_at && !isPublicRoute) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}