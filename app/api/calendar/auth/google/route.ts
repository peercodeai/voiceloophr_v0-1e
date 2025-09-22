import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar'

export async function POST(request: NextRequest) {
  try {
    // Use the same OAuth credentials as Google Drive
    const origin = request.nextUrl.origin
    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${origin}/api/calendar/auth/google`,
    })

    const authUrl = googleService.getAuthUrl(true) // Force account selection
    
    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Google OAuth URL generated using existing Drive credentials'
    })
  } catch (error) {
    console.error('Google auth URL generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Google OAuth URL. Please check your Google OAuth credentials.'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code not provided'
      }, { status: 400 })
    }

    const origin = request.nextUrl.origin
    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${origin}/api/calendar/auth/google`,
    })

    const tokens = await googleService.getTokens(code)
    
    // Return a page that stores tokens in localStorage and closes the popup
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Calendar Connected</title>
        </head>
        <body>
          <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>✅ Google Calendar Connected Successfully!</h2>
            <p>You can now close this window and return to the calendar.</p>
          </div>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('google_calendar_tokens', JSON.stringify(${JSON.stringify(tokens)}));
            
            // Close the popup window
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Google token exchange failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to exchange authorization code for tokens'
    }, { status: 500 })
  }
}
