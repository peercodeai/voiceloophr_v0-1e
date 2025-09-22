import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar'
import { MicrosoftCalendarService } from '@/lib/services/microsoft-calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    const origin = request.nextUrl.origin

    const provider: 'google' | 'microsoft' = (params.provider === 'microsoft') ? 'microsoft' : 'google'

    const googleClientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
    const msClientId = process.env.MICROSOFT_CLIENT_ID
    const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET

    const googleService = (googleClientId && googleClientSecret) ? new GoogleCalendarService({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${origin}/api/calendar/auth/google`,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken
    }) : null

    const microsoftService = (msClientId && msClientSecret) ? new MicrosoftCalendarService({
      clientId: msClientId,
      clientSecret: msClientSecret,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/calendar/auth/microsoft`,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken
    }) : null

    switch (action) {
      case 'test-connection': {
        const svc = provider === 'microsoft' ? microsoftService : googleService
        if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
        const connected = await svc.testConnection()
        return NextResponse.json({ 
          success: true, 
          connected,
          message: connected ? `Connected to ${provider} Calendar` : `Not connected to ${provider} Calendar`
        })
      }

      case 'get-events': {
        const svc = provider === 'microsoft' ? microsoftService : googleService
        if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
        const events = await svc.getUpcomingEvents(params.days || 7)
        return NextResponse.json({
          success: true,
          events,
          message: `Found ${events.length} events`
        })
      }

      case 'get-events-range': {
        if (!params.start || !params.end) {
          return NextResponse.json({ success: false, error: 'start and end (ISO) are required' }, { status: 400 })
        }
        const svc = provider === 'microsoft' ? microsoftService : googleService
        if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
        const rangeEvents = await svc.getEventsInRange(params.start, params.end)
        return NextResponse.json({
          success: true,
          events: rangeEvents,
          message: `Found ${rangeEvents.length} events in range`
        })
      }

      case 'get-holidays-range':
        if (!params.start || !params.end) {
          return NextResponse.json({ success: false, error: 'start and end (ISO) are required' }, { status: 400 })
        }
        // Default to US holidays if not specified
        if (provider === 'microsoft') {
          // Microsoft Graph does not have a simple public holidays endpoint; return empty
          return NextResponse.json({ success: true, events: [], message: 'Holidays not available for Microsoft provider' })
        }
        const holidayCalendar = params.calendarId || 'en.usa#holiday@group.v.calendar.google.com'
        const holidays = await (googleService as any).getHolidaysInRange(holidayCalendar, params.start, params.end)
        return NextResponse.json({ success: true, events: holidays, message: `Found ${holidays.length} holidays` })

      case 'schedule-meeting': {
        if (!params.accessToken) {
          return NextResponse.json({
            success: false,
            error: 'Access token required for scheduling meetings'
          }, { status: 401 })
        }

        try {
          const svc = provider === 'microsoft' ? microsoftService : googleService
          if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
          const event = await (svc as any).scheduleMeeting(
            params.title,
            params.startTime,
            params.endTime,
            params.attendees || [],
            params.description,
            params.location
          )
          return NextResponse.json({
            success: true,
            event,
            message: `Meeting scheduled successfully in ${provider === 'microsoft' ? 'Microsoft' : 'Google'} Calendar`
          })
        } catch (e: any) {
          const apiMsg = e?.response?.data?.error?.message || e?.message || 'Failed to schedule meeting'
          return NextResponse.json({ success: false, error: apiMsg }, { status: 400 })
        }
      }

      case 'get-auth-url': {
        const svc = provider === 'microsoft' ? microsoftService : googleService
        if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
        const authUrl = svc.getAuthUrl(true)
        return NextResponse.json({
          success: true,
          authUrl,
          message: `${provider === 'microsoft' ? 'Microsoft' : 'Google'} Calendar OAuth URL generated`
        })
      }

      case 'update-event':
        try {
          const svc = provider === 'microsoft' ? microsoftService : googleService
          if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
          const updated = await (svc as any).updateEvent(params.eventId, params.updates || {})
          return NextResponse.json({ success: true, event: updated })
        } catch (e: any) {
          const apiMsg = e?.response?.data?.error?.message || e?.message || 'Failed to update event'
          return NextResponse.json({ success: false, error: apiMsg }, { status: 400 })
        }

      case 'cancel-event':
        try {
          const svc = provider === 'microsoft' ? microsoftService : googleService
          if (!svc) return NextResponse.json({ success: false, error: 'Provider not configured' }, { status: 500 })
          const ok = await (svc as any).cancelEvent(params.eventId)
          return NextResponse.json({ success: ok })
        } catch (e: any) {
          const apiMsg = e?.response?.data?.error?.message || e?.message || 'Failed to cancel event'
          return NextResponse.json({ success: false, error: apiMsg }, { status: 400 })
        }

      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Real calendar API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar credentials not configured'
      }, { status: 500 })
    }

    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: 'https://v0-voice-loop-hr-platform.vercel.app/api/calendar/auth/google'
    })

    switch (action) {
      case 'auth-url':
        const authUrl = googleService.getAuthUrl(true)
        return NextResponse.json({
          success: true,
          authUrl,
          message: 'Google Calendar OAuth URL generated'
        })

      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Real calendar API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
