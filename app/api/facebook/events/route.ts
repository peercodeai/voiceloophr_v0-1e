import { NextRequest, NextResponse } from 'next/server'
import { FacebookService, FacebookTokens } from '@/lib/services/facebook'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const upcoming = searchParams.get('upcoming') === 'true'

    // Get tokens from localStorage (this would be passed from client)
    const tokensString = request.headers.get('x-facebook-tokens')
    if (!tokensString) {
      return NextResponse.json({
        success: false,
        error: 'Facebook tokens not provided'
      }, { status: 401 })
    }

    const tokens: FacebookTokens = JSON.parse(tokensString)
    const facebookService = new FacebookService(tokens)

    if (facebookService.isTokenExpired()) {
      return NextResponse.json({
        success: false,
        error: 'Facebook tokens have expired. Please re-authenticate.'
      }, { status: 401 })
    }

    let result
    if (upcoming) {
      result = await facebookService.getUpcomingEvents(limit)
    } else {
      result = await facebookService.getEvents(limit)
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      paging: result.paging,
      count: result.data.length,
      upcoming
    })

  } catch (error) {
    console.error('Facebook events API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Facebook events'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, start_time, end_time, place } = await request.json()

    if (!name || !start_time) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: name, start_time'
      }, { status: 400 })
    }

    // Get tokens from localStorage (this would be passed from client)
    const tokensString = request.headers.get('x-facebook-tokens')
    if (!tokensString) {
      return NextResponse.json({
        success: false,
        error: 'Facebook tokens not provided'
      }, { status: 401 })
    }

    const tokens: FacebookTokens = JSON.parse(tokensString)
    const facebookService = new FacebookService(tokens)

    if (facebookService.isTokenExpired()) {
      return NextResponse.json({
        success: false,
        error: 'Facebook tokens have expired. Please re-authenticate.'
      }, { status: 401 })
    }

    const eventData = {
      name,
      description: description || '',
      start_time,
      end_time: end_time || '',
      place: place || ''
    }

    const result = await facebookService.createEvent(eventData)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Event created successfully'
    })

  } catch (error) {
    console.error('Facebook create event API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Facebook event'
    }, { status: 500 })
  }
}


