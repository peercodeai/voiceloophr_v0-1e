/**
 * MCP Test API Route
 * Endpoint to test MCP infrastructure
 */

import { NextRequest, NextResponse } from 'next/server'
import { runMCPTests } from '@/lib/mcp/test'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running MCP infrastructure tests...')
    
    const success = await runMCPTests()
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'MCP infrastructure tests passed',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'MCP infrastructure tests failed',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('MCP test error:', error)
    return NextResponse.json({
      success: false,
      message: 'MCP test error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
