import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Disable this endpoint in production for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  const origin = request.nextUrl.origin
  const masks = (value?: string) => {
    if (!value) return null
    if (value.length <= 8) return '********'
    return `${value.slice(0, 6)}...${value.slice(-6)}`
  }

  return NextResponse.json({
    origin,
    env: {
      GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || null,
      GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID || null,
      GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI || null,
      GOOGLE_OAUTH_CLIENT_SECRET: masks(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      GOOGLE_CALENDAR_CLIENT_SECRET: masks(process.env.GOOGLE_CALENDAR_CLIENT_SECRET),
    }
  })
}


