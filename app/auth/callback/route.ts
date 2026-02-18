import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function generateUsername(fullName: string): string {
  const base = fullName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}_${suffix}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  const supabase = await createServerSupabaseClient()

  // Handle email confirmation (token_hash)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: type === 'email' ? 'email' : 'signup',
      token_hash,
    })

    if (!error && data.user) {
      // Create profile if it doesn't exist
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existing) {
        const fullName = data.user.user_metadata?.full_name ?? data.user.email ?? 'user'
        const username = generateUsername(fullName)
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: 'fan',
          username,
          display_name: fullName,
        })
      }

      const email = data.user.email || ''
      return NextResponse.redirect(`${origin}/verify-email?verified=true&email=${encodeURIComponent(email)}`)
    }

    // Error: preserve email if available from error or try localStorage fallback
    const emailParam = data?.user?.email ? `&email=${encodeURIComponent(data.user.email)}` : ''
    return NextResponse.redirect(`${origin}/verify-email?error=true${emailParam}`)
  }

  // Handle OAuth (code)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create profile if it doesn't exist
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existing) {
        const fullName = data.user.user_metadata?.full_name ?? data.user.email ?? 'user'
        const username = generateUsername(fullName)
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: 'fan',
          username,
          display_name: fullName,
        })
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Fallback error redirect (no email available)
  return NextResponse.redirect(`${origin}/verify-email?error=true`)
}