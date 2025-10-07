import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService } from '@/lib/services/openai'
import { documentAnalysisSchema, validateRequest, createErrorResponse, APIError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Log the request for debugging
    console.log('🔍 Analyze API called at:', new Date().toISOString())
    console.log('🔑 Environment check:', {
      hasServerKey: !!process.env.OPENAI_API_KEY,
      hasUserKey: false // Will be updated below
    })

    const body = await request.json()
    const { text, fileName, fileType, openaiKey } = validateRequest(documentAnalysisSchema, body)

    // Use user-provided API key if available, otherwise fall back to environment variable
    const finalOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;
    
    console.log('🔑 API Key check:', {
      hasUserKey: !!openaiKey,
      hasServerKey: !!process.env.OPENAI_API_KEY,
      hasFinalKey: !!finalOpenaiKey
    })

    if (!finalOpenaiKey) {
      console.error('❌ No OpenAI API key available')
      return NextResponse.json(
        createErrorResponse(500, 'OpenAI API key not configured. Please add your API key in settings.', 'API_KEY_MISSING', {
          suggestion: 'Go to Settings and configure your OpenAI API key to enable AI analysis.',
          debug: {
            hasUserKey: !!openaiKey,
            hasServerKey: !!process.env.OPENAI_API_KEY,
            environment: process.env.NODE_ENV
          }
        }),
        { status: 500 }
      )
    }

    // Initialize OpenAI service
    console.log('🤖 Initializing OpenAI service...')
    const openaiService = new OpenAIService({ apiKey: finalOpenaiKey })

    // Perform real AI analysis
    console.log('🔍 Starting document analysis...')
    const analysis = await openaiService.analyzeDocument(text, fileName, fileType)
    console.log('✅ Analysis completed successfully')

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Document analyzed successfully with OpenAI'
    })

  } catch (error) {
    console.error('❌ AI analysis API error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      })
    }
    
    if (error instanceof APIError) {
      return NextResponse.json(
        createErrorResponse(error.statusCode, error.message, error.code, error.details),
        { status: error.statusCode }
      )
    }
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network')
    const isTimeoutError = errorMessage.includes('timeout')
    const isOpenAIError = errorMessage.includes('OpenAI') || errorMessage.includes('API')
    
    return NextResponse.json(
      createErrorResponse(500, 'AI analysis failed', 'ANALYSIS_ERROR', {
        details: errorMessage,
        errorType: isNetworkError ? 'network' : isTimeoutError ? 'timeout' : isOpenAIError ? 'openai' : 'unknown',
        fallback: 'Using basic text analysis instead',
        debug: {
          hasUserKey: !!openaiKey,
          hasServerKey: !!process.env.OPENAI_API_KEY,
          environment: process.env.NODE_ENV
        }
      }),
      { status: 500 }
    )
  }
}
