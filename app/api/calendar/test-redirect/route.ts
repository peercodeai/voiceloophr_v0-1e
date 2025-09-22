import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Always derive from current request origin for accuracy in local vs prod
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/calendar/auth/google`
    
    return NextResponse.json({
      success: true,
      redirectUri,
      appUrl: origin,
      message: 'Current redirect URI configuration'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get redirect URI'
    }, { status: 500 })
  }
}
