import { NextRequest, NextResponse } from 'next/server'
import { TwitterService, TwitterTokens } from '@/lib/services/twitter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')

    // Get tokens from localStorage (this would be passed from client)
    const tokensString = request.headers.get('x-twitter-tokens')
    if (!tokensString) {
      return NextResponse.json({
        success: false,
        error: 'Twitter tokens not provided'
      }, { status: 401 })
    }

    const tokens: TwitterTokens = JSON.parse(tokensString)
    const twitterService = new TwitterService(tokens)

    if (twitterService.isTokenExpired()) {
      return NextResponse.json({
        success: false,
        error: 'Twitter tokens have expired. Please re-authenticate.'
      }, { status: 401 })
    }

    const result = await twitterService.getDMs(limit)

    return NextResponse.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0
    })

  } catch (error) {
    console.error('Twitter DMs API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Twitter DMs'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { recipientId, text } = await request.json()

    if (!recipientId || !text) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: recipientId, text'
      }, { status: 400 })
    }

    // Get tokens from localStorage (this would be passed from client)
    const tokensString = request.headers.get('x-twitter-tokens')
    if (!tokensString) {
      return NextResponse.json({
        success: false,
        error: 'Twitter tokens not provided'
      }, { status: 401 })
    }

    const tokens: TwitterTokens = JSON.parse(tokensString)
    const twitterService = new TwitterService(tokens)

    if (twitterService.isTokenExpired()) {
      return NextResponse.json({
        success: false,
        error: 'Twitter tokens have expired. Please re-authenticate.'
      }, { status: 401 })
    }

    const result = await twitterService.sendDM(recipientId, text)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'DM sent successfully'
    })

  } catch (error) {
    console.error('Twitter send DM API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send Twitter DM'
    }, { status: 500 })
  }
}


