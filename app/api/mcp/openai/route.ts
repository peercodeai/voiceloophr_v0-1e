/**
 * OpenAI MCP Server API Route
 * Handles MCP requests for OpenAI functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAIMCPServer } from '@/lib/mcp/servers/openai-server'

// Initialize OpenAI MCP Server
const openaiServer = new OpenAIMCPServer({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.3
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle MCP request directly
    const response = await openaiServer.handleRequest(body)
    return NextResponse.json(response)
  } catch (error) {
    console.error('OpenAI MCP Server error:', error)
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return server status
    const status = openaiServer.getStatus()
    return NextResponse.json({
      success: true,
      server: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('OpenAI MCP Server status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
