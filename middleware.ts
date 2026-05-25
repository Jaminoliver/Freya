import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that always require authentication
const PROTECTED_ROUTES = [
  '/messages',
  '/notifications',
  '/wallet',
  '/settings',
  '/subscriptions',
  '/saved',
  '/create',
  '/create-story',
  '/become-a-creator',
  '/admin',
]

// Auth + legal pages — always public, no session check needed
const AUTH_ROUTES = [
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/verify-otp', '/terms', '/privacy', '/auth/callback',
]

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

  // Root → feed (guests and logged-in users both go to dashboard)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  )

  // Public = auth/legal pages OR anything not in the protected list
  // This covers: /explore, /dashboard, /posts/*, /[username] (creator pages)
  const isPublicRoute = isAuthRoute || !isProtectedRoute

  if (isAuthRoute) {
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
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch (error) {
    console.error('[Middleware] Supabase getSession failed:', error)

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next({ request })
  }

  // Guest hitting a protected route → redirect to login
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged-in user hitting login/signup → redirect to dashboard
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Logged-in but unverified email → redirect to verify (skip for public routes)
  if (user && !user.email_confirmed_at && isProtectedRoute) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}