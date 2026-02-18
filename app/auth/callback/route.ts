import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function generateUsername(fullName: string): string {
  const base = fullName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}_${suffix}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create profile if it doesn't exist yet
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

      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}/verify-email?verified=true`)
    }
  }

  return NextResponse.redirect(`${origin}/verify-email?error=true`)
}