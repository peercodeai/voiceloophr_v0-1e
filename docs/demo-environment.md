# Demo Environment Setup

This document outlines the setup and configuration for the VoiceLoop HR demo environment.

## Overview

The demo environment provides a publicly accessible, sandboxed version of the VoiceLoop HR platform with limited functionality and pre-loaded sample data.

## Demo Features

### ✅ Available Features
- **Document Upload**: Limited to 5MB files, 3 uploads per session
- **AI Analysis**: Basic document summarization with OpenAI
- **Voice Chat**: Limited to 10 messages per session
- **Semantic Search**: Basic search functionality
- **PDF Viewer**: Full document viewing capabilities
- **Guest Mode**: No registration required

### ❌ Limited Features
- **Google Drive Integration**: Read-only access to demo documents
- **LinkedIn Integration**: Demo profile data only
- **Database Storage**: Session-based storage only
- **Advanced TTS**: Basic browser TTS only
- **Calendar Integration**: View-only access

## Environment Configuration

### Required Environment Variables

```env
# Demo Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://demo-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo_anon_key
SUPABASE_SERVICE_ROLE_KEY=demo_service_role_key

# Demo App Configuration
NEXT_PUBLIC_APP_URL=https://voiceloophr-demo.vercel.app

# Demo API Keys (Limited functionality)
OPENAI_API_KEY=sk-demo-key-limited-functionality
NEXT_PUBLIC_OPENAI_API_KEY=sk-demo-key-limited-functionality

# Demo Integration Keys (Read-only access)
GOOGLE_OAUTH_CLIENT_ID=demo-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=demo_client_secret

# Demo Feature Flags
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_FEATURE_LIMIT_UPLOADS=true
NEXT_PUBLIC_FEATURE_LIMIT_CHAT_MESSAGES=10
NEXT_PUBLIC_FEATURE_LIMIT_FILE_SIZE=5242880
```

## Sample Data

The demo environment includes pre-loaded sample documents:

### HR Documents
- Employee Handbook (PDF)
- Company Policy Manual (PDF)
- Job Description Template (DOCX)
- Performance Review Form (PDF)

### Business Documents
- Meeting Minutes (PDF)
- Project Proposal (DOCX)
- Budget Report (XLSX)
- Contract Template (PDF)

## Deployment Process

### Automated Deployment
The demo environment is automatically deployed when:
- Code is pushed to the `demo` branch
- Manual deployment is triggered via GitHub Actions

### Manual Deployment
1. Go to GitHub Actions → Demo Deployment
2. Click "Run workflow"
3. Select "demo" environment
4. Monitor deployment progress

## Access Control

### Demo Limitations
- **Session Timeout**: 2 hours of inactivity
- **Upload Limits**: 3 files per session, 5MB max
- **Chat Limits**: 10 messages per session
- **Storage**: Temporary browser storage only

### Security Measures
- No persistent user data storage
- Read-only API access where possible
- Rate limiting on all endpoints
- Automatic cleanup of demo data

## Monitoring

### Health Checks
- Application availability
- API endpoint responses
- Database connectivity
- Third-party service status

### Usage Analytics
- Page views and user sessions
- Feature usage statistics
- Error rates and performance metrics
- Demo conversion tracking

## Maintenance

### Regular Tasks
- **Weekly**: Update sample documents
- **Monthly**: Review and update demo data
- **Quarterly**: Security audit and dependency updates

### Troubleshooting
- Check deployment logs in GitHub Actions
- Monitor Vercel deployment status
- Review error logs in demo environment
- Test demo functionality manually

## Contact

For demo environment issues or questions:
- **Technical Issues**: Create GitHub issue with `demo` label
- **Access Requests**: Contact development team
- **Feedback**: Use demo feedback form on the platform

## Demo URL

The demo environment is accessible at: `https://voiceloophr-demo.vercel.app`

**Note**: The demo URL will be updated once the deployment is configured and the demo branch is set up.
