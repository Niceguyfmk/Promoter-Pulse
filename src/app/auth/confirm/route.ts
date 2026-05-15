import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/shared/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // If it's an invite or password recovery, send them to set their password
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(new URL('/set-password', request.url))
      }
      
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=Invalid or expired token', request.url))
}
