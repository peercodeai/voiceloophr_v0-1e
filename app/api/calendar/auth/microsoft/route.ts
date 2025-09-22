import { NextRequest, NextResponse } from 'next/server'
import { MicrosoftCalendarService } from '@/lib/services/microsoft-calendar'

export async function POST(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin
    const service = new MicrosoftCalendarService({
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/calendar/auth/microsoft`,
    })
    const authUrl = service.getAuthUrl(true)
    return NextResponse.json({ success: true, authUrl })
  } catch (error) {
    console.error('Microsoft auth URL generation failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate Microsoft OAuth URL' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (!code) {
      return NextResponse.json({ success: false, error: 'Authorization code not provided' }, { status: 400 })
    }

    const origin = request.nextUrl.origin
    const service = new MicrosoftCalendarService({
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/calendar/auth/microsoft`,
    })

    const tokens = await service.getTokens(code)

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Microsoft Calendar Connected</title></head>
        <body>
          <div style="text-align:center;padding:20px;font-family:Arial, sans-serif;">
            <h2>✅ Microsoft Calendar Connected Successfully!</h2>
            <p>You can now close this window and return to the app.</p>
          </div>
          <script>
            localStorage.setItem('microsoft_calendar_tokens', JSON.stringify(${JSON.stringify(tokens)}));
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>
    `
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (error) {
    console.error('Microsoft token exchange failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to exchange authorization code for tokens' }, { status: 500 })
  }
}


