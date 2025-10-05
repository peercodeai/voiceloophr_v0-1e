import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService } from '@/lib/services/openai'
import { documentAnalysisSchema, validateRequest, createErrorResponse, APIError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, fileName, fileType, openaiKey } = validateRequest(documentAnalysisSchema, body)

    // Use user-provided API key if available, otherwise fall back to environment variable
    const finalOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;
    if (!finalOpenaiKey) {
      return NextResponse.json(
        createErrorResponse(500, 'OpenAI API key not configured. Please add your API key in settings.', 'API_KEY_MISSING', {
          suggestion: 'Go to Settings and configure your OpenAI API key to enable AI analysis.'
        }),
        { status: 500 }
      )
    }

    // Initialize OpenAI service
    const openaiService = new OpenAIService({ apiKey: finalOpenaiKey })

    // Perform real AI analysis
    const analysis = await openaiService.analyzeDocument(text, fileName, fileType)

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Document analyzed successfully with OpenAI'
    })

  } catch (error) {
    console.error('AI analysis API error:', error)
    
    if (error instanceof APIError) {
      return NextResponse.json(
        createErrorResponse(error.statusCode, error.message, error.code, error.details),
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      createErrorResponse(500, 'AI analysis failed', 'ANALYSIS_ERROR', {
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using basic text analysis instead'
      }),
      { status: 500 }
    )
  }
}
