import { NextRequest, NextResponse } from 'next/server'
import { TwitterService, TwitterTokens } from '@/lib/services/twitter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'tweets' // tweets, mentions, search

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
    switch (type) {
      case 'mentions':
        result = await twitterService.getMentions(limit)
        break
      case 'search':
        const query = searchParams.get('query')
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query parameter required for search'
          }, { status: 400 })
        }
        result = await twitterService.searchTweets(query, limit)
        break
      case 'tweets':
      default:
        result = await twitterService.getTweets(userId, limit)
        break
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0,
      type,
      userId
    })

  } catch (error) {
    console.error('Twitter tweets API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Twitter tweets'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, replyToId } = await request.json()

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: text'
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

    const result = await twitterService.postTweet(text, replyToId)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Tweet posted successfully'
    })

  } catch (error) {
    console.error('Twitter post tweet API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post tweet'
    }, { status: 500 })
  }
}


