// app/auth/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function generateUsername(fullName: string): string {
  const base = fullName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}_${suffix}`;
}

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // PGRST116 = no rows found, which is expected for new users
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[auth/callback] profile select error:', selectError)
      return { success: false, error: 'profile_select_failed' }
    }

    if (!existing) {
      const fullName = (user.user_metadata?.full_name as string) ?? user.email ?? 'user'
      const username = generateUsername(fullName)
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        role: 'fan',
        username,
        display_name: fullName,
      })

      if (insertError) {
        console.error('[auth/callback] profile insert error:', insertError)
        return { success: false, error: 'profile_insert_failed' }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[auth/callback] ensureProfile exception:', err)
    return { success: false, error: 'profile_exception' }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  // Handle OAuth provider errors (user denied permission, provider failure, etc.)
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  if (oauthError) {
    console.error('[auth/callback] OAuth provider error:', oauthError, oauthErrorDescription)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const supabase = await createServerSupabaseClient()

  // ───── Handle email confirmation (token_hash) ─────
  if (token_hash && type) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        type: type === 'email' ? 'email' : 'signup',
        token_hash,
      })

      if (!error && data.user) {
        // Create profile if missing — don't block user if it fails
        const profileResult = await ensureProfile(supabase, data.user)
        if (!profileResult.success) {
          console.warn('[auth/callback] profile creation failed but continuing:', profileResult.error)
        }

        const email = data.user.email || ''
        return NextResponse.redirect(`${origin}/verify-email?verified=true&email=${encodeURIComponent(email)}`)
      }

      // verifyOtp failed — preserve email if possible
      const emailParam = data?.user?.email ? `&email=${encodeURIComponent(data.user.email)}` : ''
      console.error('[auth/callback] verifyOtp error:', error?.message)
      return NextResponse.redirect(`${origin}/verify-email?error=true${emailParam}`)
    } catch (err) {
      console.error('[auth/callback] verifyOtp exception:', err)
      return NextResponse.redirect(`${origin}/verify-email?error=true`)
    }
  }

  // ───── Handle OAuth (code exchange) ─────
  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data.user) {
        console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
      }

      // Create profile if missing — don't block user if it fails
      const profileResult = await ensureProfile(supabase, data.user)
      if (!profileResult.success) {
        console.warn('[auth/callback] profile creation failed but continuing:', profileResult.error)
        // Still let them into the app — they have a valid session
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    } catch (err) {
      console.error('[auth/callback] OAuth exchange exception:', err)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    }
  }

  // ───── Fallback ─────
  // No token_hash, no code, no error — shouldn't normally happen
  console.warn('[auth/callback] called without token_hash or code')
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}