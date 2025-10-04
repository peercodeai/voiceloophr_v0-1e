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

// GET /api/calendar/[id] - Fetch a single calendar event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        employee:employee_id(id, name, email),
        interviewer:interviewer_id(id, name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching calendar event:', error)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event: data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/calendar/[id] - Update a calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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

    // Validate time logic if both times are provided
    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const updateData = {
      title,
      description,
      start_time,
      end_time,
      employee_id,
      interviewer_id,
      location,
      event_type,
      status
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employee_id(id, name, email),
        interviewer:interviewer_id(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating calendar event:', error)
      return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 })
    }

    return NextResponse.json({ event: data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/calendar/[id] - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const supabase = getSupabase()
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting calendar event:', error)
      return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Calendar event deleted successfully' })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
