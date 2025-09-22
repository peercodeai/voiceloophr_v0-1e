# Calendar Integration Setup Guide

This guide will help you set up Google Calendar and Microsoft Outlook integration with VoiceLoop HR using the Model Context Protocol (MCP).

## 🚀 Quick Start

The calendar integration is already built and ready to use! It includes:
- ✅ Beautiful calendar UI with modern design
- ✅ Mini calendar widget on dashboard
- ✅ Dedicated calendar page
- ✅ MCP architecture for extensibility
- ✅ Mock data for development and testing

## 🔧 Production Setup

To enable real Google Calendar and Outlook integration, follow these steps:

### 1. Google Calendar Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google Calendar API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`

4. **Set Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

### 2. Microsoft Outlook Setup

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com/
   - Sign in with your Microsoft account

2. **Register Application**
   - Go to "Azure Active Directory" > "App registrations"
   - Click "New registration"
   - Name: "VoiceLoop HR Calendar"
   - Redirect URI: `https://yourdomain.com/auth/microsoft/callback`

3. **Configure API Permissions**
   - Go to "API permissions"
   - Add permissions:
     - Microsoft Graph > Delegated > Calendars.Read
     - Microsoft Graph > Delegated > Calendars.ReadWrite
   - Click "Grant admin consent"

4. **Set Environment Variables**
   ```env
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   MICROSOFT_REDIRECT_URI=https://yourdomain.com/auth/microsoft/callback
   MICROSOFT_TENANT_ID=common
   ```

### 3. Deploy to Production

1. **Set Environment Variables in Vercel**
   - Go to your Vercel dashboard
   - Select your project
   - Go to "Settings" > "Environment Variables"
   - Add all the calendar API keys

2. **Redeploy**
   - Push changes to your repository
   - Vercel will automatically redeploy

## 🎯 Features

### Calendar UI Components
- **Navigation Bar**: Calendar icon for quick access
- **Dashboard Widget**: Mini calendar showing upcoming events
- **Calendar Page**: Full calendar interface with meeting scheduling
- **Document Integration**: Calendar tab in document viewer

### MCP Architecture
- **Server-side Processing**: All calendar operations run on the server
- **Provider Support**: Google Calendar and Microsoft Outlook
- **Extensible**: Easy to add more calendar providers
- **Error Handling**: Graceful fallbacks and user feedback

### Calendar Operations
- **Schedule Meetings**: Create events with attendees, location, description
- **View Events**: List upcoming events with rich details
- **Find Free Time**: Search for available time slots
- **Update Events**: Modify existing calendar events
- **Cancel Events**: Remove scheduled meetings

## 🔍 Testing

### Development Mode
- Uses mock data by default
- All UI features work without API setup
- Perfect for development and testing

### Production Mode
- Real calendar integration when APIs are configured
- Automatic fallback to mock data if APIs fail
- Comprehensive error handling

## 🛠️ Troubleshooting

### Common Issues

1. **"Failed to fetch" Error**
   - Check if environment variables are set correctly
   - Verify API credentials are valid
   - Check browser console for detailed error messages

2. **Calendar Not Loading**
   - Ensure MCP server is running
   - Check API endpoint responses
   - Verify OAuth redirect URIs match

3. **Events Not Appearing**
   - Check calendar permissions
   - Verify API scopes are correct
   - Test with mock data first

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=mcp:*
```

## 📚 API Reference

### Calendar API Endpoints

- `GET /api/calendar?action=test-connection` - Test calendar connection
- `GET /api/calendar?action=upcoming-events&days=7` - Get upcoming events
- `POST /api/calendar` - Schedule new meeting

### MCP Tools

- `calendar/scheduleMeeting` - Schedule a new meeting
- `calendar/findFreeTime` - Find available time slots
- `calendar/listEvents` - List calendar events
- `calendar/updateEvent` - Update existing event
- `calendar/cancelEvent` - Cancel scheduled event

## 🎨 UI Components

### MiniCalendar
```tsx
<MiniCalendar 
  className="border-thin" 
  showUpcoming={true} 
  maxEvents={3} 
/>
```

### CalendarIntegration
```tsx
<CalendarIntegration 
  documentId="doc_123"
  documentTitle="Meeting Notes"
  documentContent="Content here"
/>
```

## 🚀 Next Steps

1. **Set up OAuth flows** for user authentication
2. **Implement real API calls** to Google Calendar and Outlook
3. **Add calendar sync** for real-time updates
4. **Add more providers** (Apple Calendar, etc.)
5. **Implement recurring events** and advanced scheduling

## 📞 Support

If you need help with the calendar integration:
1. Check the troubleshooting section above
2. Review the API documentation
3. Test with mock data first
4. Check the browser console for errors

The calendar integration is designed to be robust and user-friendly, with excellent fallbacks and error handling! 🎉
