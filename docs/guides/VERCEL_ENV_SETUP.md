# Vercel Environment Variables Setup

## Required Environment Variables for Google Calendar Integration

Add these to your Vercel project settings:

### Google OAuth Credentials
```
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret_here
```

### App URL
```
NEXT_PUBLIC_APP_URL=https://v0-voice-loop-hr-platform.vercel.app
```

### Optional (if different from above)
```
GOOGLE_CALENDAR_REDIRECT_URI=https://v0-voice-loop-hr-platform.vercel.app/api/calendar/auth/google
```

## How to Add to Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your project: `v0-voice-loop-hr-platform`
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Click **Save**
6. **Redeploy** your project

## Google Cloud Console Redirect URIs:

Make sure these are added to your Google OAuth 2.0 Client ID:

```
https://v0-voice-loop-hr-platform.vercel.app/api/calendar/auth/google
https://v0-voice-loop-hr-platform.vercel.app/auth/callback
```

## Test the Fix:

1. Wait for Vercel to redeploy (2-3 minutes)
2. Go to: https://v0-voice-loop-hr-platform.vercel.app/calendar
3. Click "Connect Calendar" → "Select Account"
4. Should now work without redirect_uri_mismatch error
