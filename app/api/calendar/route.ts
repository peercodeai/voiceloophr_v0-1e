import { NextRequest, NextResponse } from 'next/server'
import { CalendarServiceMCP } from '@/lib/services/calendar-mcp'

const calendarService = new CalendarServiceMCP()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'test-connection':
        const connected = await calendarService.testConnection()
        return NextResponse.json({ success: true, connected })

      case 'upcoming-events':
        const days = parseInt(searchParams.get('days') || '7')
        const result = await calendarService.getUpcomingEvents(days)
        return NextResponse.json(result)

      case 'schedule-meeting':
        // This would be handled by POST
        return NextResponse.json({ error: 'Use POST method for scheduling meetings' }, { status: 405 })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'schedule-meeting':
        const result = await calendarService.scheduleMeeting(
          params.title,
          params.startTime,
          params.endTime,
          params.attendees || [],
          params.description,
          params.location
        )
        return NextResponse.json(result)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
