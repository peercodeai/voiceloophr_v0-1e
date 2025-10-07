import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    console.log('🧪 Testing OpenAI API with key:', apiKey.substring(0, 10) + '...')

    // Simple test call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, this is a test!"'
          }
        ],
        max_tokens: 10,
      }),
    })

    console.log('📡 OpenAI test response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ OpenAI test error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.error?.message || 'OpenAI API error',
        status: response.status 
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ OpenAI test successful:', data.choices[0]?.message?.content)

    return NextResponse.json({ 
      success: true, 
      response: data.choices[0]?.message?.content,
      status: response.status 
    })

  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
