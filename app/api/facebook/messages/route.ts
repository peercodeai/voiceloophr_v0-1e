import { NextRequest, NextResponse } from 'next/server'
import { FacebookService, FacebookTokens } from '@/lib/services/facebook'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const pageId = searchParams.get('pageId')

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
    if (pageId) {
      // Get messages for specific page
      result = await facebookService.getMessages(pageId, limit)
    } else {
      // Get user's pages first, then messages from first page
      const pages = await facebookService.getPages()
      if (pages.data && pages.data.length > 0) {
        const firstPage = pages.data[0]
        result = await facebookService.getMessages(firstPage.id, limit)
      } else {
        return NextResponse.json({
          success: false,
          error: 'No Facebook pages found. Please ensure you have a Facebook page connected.'
        }, { status: 404 })
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      paging: result.paging,
      count: result.data.length
    })

  } catch (error) {
    console.error('Facebook messages API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Facebook messages'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pageId, recipientId, message } = await request.json()

    if (!pageId || !recipientId || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: pageId, recipientId, message'
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

    const result = await facebookService.sendMessage(pageId, recipientId, message)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Message sent successfully'
    })

  } catch (error) {
    console.error('Facebook send message API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send Facebook message'
    }, { status: 500 })
  }
}


