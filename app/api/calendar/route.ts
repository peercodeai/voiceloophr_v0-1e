import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// GET /api/calendar - Fetch all calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const eventType = searchParams.get('event_type')

    const supabase = getSupabase()
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        employee:employee_id(id, name, email),
        interviewer:interviewer_id(id, name, email)
      `)
      .order('start_time', { ascending: true })

    // Apply date filters
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('end_time', endDate)
    }

    // Apply event type filter
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching calendar events:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
    }

    return NextResponse.json({ events: data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/calendar - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      employee_id, 
      interviewer_id, 
      location, 
      event_type, 
      status 
    } = body

    // Validate required fields
    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Title, start_time, and end_time are required' }, { status: 400 })
    }

    // Validate time logic
    if (new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const eventData = {
      title,
      description,
      start_time,
      end_time,
      employee_id,
      interviewer_id,
      location,
      event_type: event_type || 'interview',
      status: status || 'scheduled'
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(eventData)
      .select(`
        *,
        employee:employee_id(id, name, email),
        interviewer:interviewer_id(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating calendar event:', error)
      return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
    }

    return NextResponse.json({ event: data }, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
