import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { service } = await request.json()
    
    // Facebook OAuth configuration
    const clientId = process.env.FACEBOOK_APP_ID
    const redirectUri = `${request.nextUrl.origin}/api/facebook/auth/callback`
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Facebook App ID not configured. Please set FACEBOOK_APP_ID environment variable.'
      }, { status: 500 })
    }

    // Define scopes based on service type
    let scopes = 'public_profile,email'
    switch (service) {
      case 'facebookMessages':
        scopes = 'public_profile,email,pages_messaging,pages_read_engagement'
        break
      case 'facebookEvents':
        scopes = 'public_profile,email,user_events,user_managed_groups'
        break
      case 'facebook':
      default:
        scopes = 'public_profile,email'
        break
    }

    // Generate state parameter for security
    const state = `${service}_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    // Build Facebook OAuth URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('auth_type', 'rerequest')
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      service,
      scopes
    })
  } catch (error) {
    console.error('Facebook auth URL generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Facebook OAuth URL'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Facebook OAuth error: ${error}`
      }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code not provided'
      }, { status: 400 })
    }

    // Extract service from state
    const service = state?.split('_')[0] || 'facebook'
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${request.nextUrl.origin}/api/facebook/auth/callback`,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Failed to obtain access token from Facebook'
      }, { status: 400 })
    }

    // Get user profile information
    const profileResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${tokenData.access_token}`)
    const profileData = await profileResponse.json()

    // Store tokens with service-specific key
    const tokenKey = service === 'facebook' ? 'facebook_tokens' : 
                   service === 'facebookMessages' ? 'facebook_messages_tokens' : 
                   'facebook_events_tokens'

    const tokens = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in,
      user_id: profileData.id,
      user_name: profileData.name,
      user_email: profileData.email,
      service,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    }

    // Return a page that stores tokens in localStorage and closes the popup
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facebook ${service} Connected</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 40px; 
              background: #f0f2f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .success { color: #42b883; }
            .service { color: #1877f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">✅ Facebook Connected Successfully!</h2>
            <p>Service: <span class="service">${service}</span></p>
            <p>User: ${profileData.name}</p>
            <p>You can now close this window and return to the application.</p>
          </div>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('${tokenKey}', JSON.stringify(${JSON.stringify(tokens)}));
            
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
    console.error('Facebook token exchange failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to exchange authorization code for tokens'
    }, { status: 500 })
  }
}


