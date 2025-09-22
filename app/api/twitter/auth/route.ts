import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { service } = await request.json()
    
    // Twitter OAuth 2.0 configuration
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = `${request.nextUrl.origin}/api/twitter/auth/callback`
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Twitter Client ID not configured. Please set TWITTER_CLIENT_ID environment variable.'
      }, { status: 500 })
    }

    // Define scopes based on service type
    let scopes = 'tweet.read users.read'
    switch (service) {
      case 'twitterDMs':
        scopes = 'tweet.read users.read dm.read dm.write'
        break
      case 'twitterSpaces':
        scopes = 'tweet.read users.read spaces.read'
        break
      case 'twitter':
      default:
        scopes = 'tweet.read users.read tweet.write'
        break
    }

    // Generate state parameter for security
    const state = `${service}_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    // Build Twitter OAuth 2.0 URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', 'challenge')
    authUrl.searchParams.set('code_challenge_method', 'plain')
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      service,
      scopes
    })
  } catch (error) {
    console.error('Twitter auth URL generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Twitter OAuth URL'
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
        error: `Twitter OAuth error: ${error}`
      }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code not provided'
      }, { status: 400 })
    }

    // Extract service from state
    const service = state?.split('_')[0] || 'twitter'
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${request.nextUrl.origin}/api/twitter/auth/callback`,
        code_verifier: 'challenge'
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Failed to obtain access token from Twitter'
      }, { status: 400 })
    }

    // Get user profile information
    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })
    const profileData = await profileResponse.json()

    // Store tokens with service-specific key
    const tokenKey = service === 'twitter' ? 'twitter_tokens' : 
                   service === 'twitterDMs' ? 'twitter_dms_tokens' : 
                   'twitter_spaces_tokens'

    const tokens = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in,
      user_id: profileData.data?.id,
      user_name: profileData.data?.name,
      username: profileData.data?.username,
      service,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    }

    // Return a page that stores tokens in localStorage and closes the popup
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter ${service} Connected</title>
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
            .success { color: #1da1f2; }
            .service { color: #1da1f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">✅ Twitter Connected Successfully!</h2>
            <p>Service: <span class="service">${service}</span></p>
            <p>User: @${profileData.data?.username || 'Unknown'}</p>
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
    console.error('Twitter token exchange failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to exchange authorization code for tokens'
    }, { status: 500 })
  }
}


