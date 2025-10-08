import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔍 Debug analyze request:', body)
    
    // Check environment variables
    const envCheck = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    }
    
    console.log('🔑 Environment check:', envCheck)
    
    // Test with minimal required fields
    const testData = {
      text: body.text || "test document content",
      fileName: body.fileName || "test.txt",
      fileType: body.fileType || "text/plain"
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug endpoint working',
      receivedData: body,
      testData,
      environment: envCheck
    })
    
  } catch (error) {
    console.error('❌ Debug analyze error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
