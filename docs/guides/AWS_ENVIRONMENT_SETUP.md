# AWS Environment Variables Setup for OAuth

## Required Environment Variables for Production

Add these environment variables to your AWS deployment (Amplify/Vercel/ECS/etc.):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth (Required for Calendar/Drive integration)
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth (Required for Calendar integration)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://your-aws-domain.com/auth/callback
MICROSOFT_TENANT_ID=common

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-aws-domain.com

# Optional APIs
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## AWS Amplify Setup

If using AWS Amplify:

1. Go to your Amplify app dashboard
2. Navigate to "Environment variables"
3. Add all the variables above
4. Redeploy your app

## Vercel Setup

If using Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all the variables above
4. Redeploy your app

## Verification Steps

After setting up environment variables:

1. Check that your Supabase project has OAuth providers configured
2. Verify redirect URIs match your production domain
3. Test OAuth login on your production site
4. Check browser console for any remaining errors

## Common Issues

- **Missing client_id**: Environment variables not set in production
- **Invalid redirect URI**: OAuth app not configured with correct domain
- **Supabase not configured**: Missing Supabase environment variables

