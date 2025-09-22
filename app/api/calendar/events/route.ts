import { NextRequest, NextResponse } from 'next/server'
import { CalendarServiceMCP } from '@/lib/services/calendar-mcp'

const calendarService = new CalendarServiceMCP()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const days = searchParams.get('days')

    // Get upcoming events
    const daysToFetch = days ? parseInt(days) : 30
    const result = await calendarService.getUpcomingEvents(daysToFetch)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch events'
      }, { status: 500 })
    }

    // Filter events by date range if provided
    let events = result.events || []
    if (start && end) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      events = events.filter((event: any) => {
        const eventDate = new Date(event.startTime)
        return eventDate >= startDate && eventDate <= endDate
      })
    }

    return NextResponse.json({
      success: true,
      events,
      message: `Found ${events.length} events`
    })
  } catch (error) {
    console.error('Calendar events API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch calendar events'
    }, { status: 500 })
  }
}
