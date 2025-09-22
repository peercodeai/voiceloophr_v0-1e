/**
 * Calendar MCP Server API Route
 * Handles MCP requests for calendar functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { CalendarMCPServer } from '@/lib/mcp/servers/calendar-server'

// Initialize Calendar MCP Server
const calendarServer = new CalendarMCPServer({
  providers: [
    // Mock providers for now - in production, these would be configured with real tokens
    {
      name: 'google',
      accessToken: process.env.GOOGLE_CALENDAR_ACCESS_TOKEN || 'mock_token',
      refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
    },
    {
      name: 'outlook',
      accessToken: process.env.OUTLOOK_CALENDAR_ACCESS_TOKEN || 'mock_token',
      refreshToken: process.env.OUTLOOK_CALENDAR_REFRESH_TOKEN,
      calendarId: process.env.OUTLOOK_CALENDAR_ID
    }
  ],
  defaultProvider: 'google'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle MCP request directly
    const response = await calendarServer.handleRequest(body)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Calendar MCP Server error:', error)
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
    const status = calendarServer.getStatus()
    return NextResponse.json({
      success: true,
      server: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Calendar MCP Server status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
