import { SmartIntentParser } from '@/lib/smartIntentParser'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/parse-intent - Parse user query intent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const intentResult = SmartIntentParser.parseIntent(query)

    return NextResponse.json({
      success: true,
      ...intentResult
    })

  } catch (error) {
    console.error('Intent parsing error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to parse intent'
    }, { status: 500 })
  }
}

// GET /api/parse-intent - Get intent examples
export async function GET() {
  try {
    const examples = SmartIntentParser.getIntentExamples()

    return NextResponse.json({
      success: true,
      examples
    })

  } catch (error) {
    console.error('Error getting intent examples:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get intent examples'
    }, { status: 500 })
  }
}
