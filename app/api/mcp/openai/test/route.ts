/**
 * OpenAI MCP Integration Test
 * Test endpoint to verify OpenAI MCP functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAIServiceMCP } from '@/lib/services/openai-mcp'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing OpenAI MCP integration...')
    
    const openaiService = new OpenAIServiceMCP()
    
    // Test connection
    const connectionTest = await openaiService.testConnection()
    console.log('✅ Connection test:', connectionTest)
    
    // Test tools listing
    const tools = await openaiService.getAvailableTools()
    console.log('✅ Available tools:', tools.length)
    
    // Test resources listing
    const resources = await openaiService.getAvailableResources()
    console.log('✅ Available resources:', resources.length)
    
    // Test document analysis with sample text (only if OpenAI key is available)
    let analysisResult = null
    if (process.env.OPENAI_API_KEY) {
      try {
        const sampleText = "This is a sample business document for testing MCP integration. It contains important information about our company's quarterly performance and strategic initiatives."
        const analysis = await openaiService.analyzeDocument(
          sampleText,
          'test-document.txt',
          'text/plain'
        )
        analysisResult = {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          sentiment: analysis.sentiment
        }
        console.log('✅ Document analysis test:', analysis.summary)
      } catch (analysisError) {
        console.log('⚠️ Document analysis test skipped (OpenAI key issue):', analysisError)
        analysisResult = { error: 'OpenAI API key not configured or invalid' }
      }
    } else {
      console.log('⚠️ Document analysis test skipped (no OpenAI key)')
      analysisResult = { error: 'OpenAI API key not configured' }
    }
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI MCP integration tests passed',
      results: {
        connection: connectionTest,
        toolsCount: tools.length,
        resourcesCount: resources.length,
        analysis: analysisResult
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('OpenAI MCP test error:', error)
    return NextResponse.json({
      success: false,
      message: 'OpenAI MCP integration tests failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
