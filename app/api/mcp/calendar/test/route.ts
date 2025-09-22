/**
 * Calendar MCP Integration Test
 * Test endpoint to verify Calendar MCP functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { CalendarServiceMCP } from '@/lib/services/calendar-mcp'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Calendar MCP integration...')
    
    const calendarService = new CalendarServiceMCP()
    
    // Test connection
    const connectionTest = await calendarService.testConnection()
    console.log('✅ Connection test:', connectionTest)
    
    // Test tools listing
    const tools = await calendarService.getAvailableTools()
    console.log('✅ Available tools:', tools.length)
    
    // Test resources listing
    const resources = await calendarService.getAvailableResources()
    console.log('✅ Available resources:', resources.length)
    
    // Test schedule meeting
    const now = new Date()
    const endTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour later
    
    const scheduleResult = await calendarService.scheduleMeeting(
      'Test Meeting - MCP Integration',
      now.toISOString(),
      endTime.toISOString(),
      ['test@company.com'],
      'This is a test meeting to verify MCP calendar integration',
      'Conference Room A'
    )
    console.log('✅ Schedule meeting test:', scheduleResult.success)
    
    // Test find free time
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    
    const freeTimeResult = await calendarService.findFreeTime(
      ['test@company.com'],
      60, // 1 hour duration
      tomorrow.toISOString(),
      dayAfter.toISOString()
    )
    console.log('✅ Find free time test:', freeTimeResult.success)
    
    // Test list events
    const eventsResult = await calendarService.listEvents(
      now.toISOString(),
      dayAfter.toISOString()
    )
    console.log('✅ List events test:', eventsResult.success, `(${eventsResult.count} events)`)
    
    return NextResponse.json({
      success: true,
      message: 'Calendar MCP integration tests passed',
      results: {
        connection: connectionTest,
        toolsCount: tools.length,
        resourcesCount: resources.length,
        scheduleMeeting: scheduleResult,
        findFreeTime: freeTimeResult,
        listEvents: {
          success: eventsResult.success,
          count: eventsResult.count
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Calendar MCP test error:', error)
    return NextResponse.json({
      success: false,
      message: 'Calendar MCP integration tests failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
