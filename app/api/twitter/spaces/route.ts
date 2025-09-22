import { NextRequest, NextResponse } from 'next/server'
import { TwitterService, TwitterTokens } from '@/lib/services/twitter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const query = searchParams.get('query')
    const userId = searchParams.get('userId')

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

    let result
    if (userId) {
      // Get spaces for specific user
      result = await twitterService.getUserSpaces(userId, limit)
    } else if (query) {
      // Search for spaces
      result = await twitterService.getSpaces(query, limit)
    } else {
      // Get general spaces
      result = await twitterService.getSpaces(undefined, limit)
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0,
      query,
      userId
    })

  } catch (error) {
    console.error('Twitter Spaces API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Twitter Spaces'
    }, { status: 500 })
  }
}


