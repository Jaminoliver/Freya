import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// ─── Module-level user cache ──────────────────────────────────────────────────
// Keyed by auth token — same token within 30s = zero extra Supabase auth calls.
// This prevents 429s when multiple API routes call getUser() simultaneously.

const USER_CACHE_TTL = 30_000;

interface CachedUser {
  user:      User;
  expiresAt: number;
}

const userCache = new Map<string, CachedUser>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache.entries()) {
    if (entry.expiresAt < now) userCache.delete(key);
  }
}, 60_000);

// ─── Client factory ───────────────────────────────────────────────────────────
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// ─── Cached getUser ───────────────────────────────────────────────────────────
// Use this in every API route instead of client.auth.getUser().
// Multiple routes firing at the same time share one Supabase auth call.
export async function getUser(): Promise<{ user: User | null; error: any }> {
  try {
    const cookieStore = await cookies();
    const allCookies  = cookieStore.getAll();

    // Build cache key from Supabase session cookies
    const cacheKey = allCookies
      .filter((c) => c.name.startsWith('sb-'))
      .map((c) => `${c.name}=${c.value}`)
      .sort()
      .join('|');

    if (cacheKey) {
      const cached = userCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { user: cached.user, error: null };
      }
    }

    // Cache miss — hit Supabase auth once
    const client = await createServerSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();

    if (user && cacheKey) {
      userCache.set(cacheKey, {
        user,
        expiresAt: Date.now() + USER_CACHE_TTL,
      });
    }

    return { user: user ?? null, error };

  } catch (err) {
    return { user: null, error: err };
  }
}

// ─── Service role client — bypasses RLS ──────────────────────────────────────
// Use ONLY in server-side webhook handlers and cron jobs
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}