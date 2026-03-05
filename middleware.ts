import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/verify-otp', '/terms', '/privacy', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // ── Create response first, then attach supabase to it ──────────────────────
  // This is the correct Supabase SSR pattern — the response object must be
  // created before the client so cookie writes propagate back to the browser.
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
          // Write to both the request (for downstream use) and the response
          // (so the browser receives the refreshed session cookies)
          cookiesToSet.forEach(({ name, value, options }) => {
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

  // IMPORTANT: Always call getUser() to refresh the session token.
  // This must happen before any redirects so cookies are refreshed on every request.
  const { data: { user } } = await supabase.auth.getUser()

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