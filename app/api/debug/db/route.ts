import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const haveUrl = Boolean(url)
  const haveService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  return NextResponse.json({
    haveUrl,
    haveService,
    adminClientReady: Boolean(supabaseAdmin),
  })
}


