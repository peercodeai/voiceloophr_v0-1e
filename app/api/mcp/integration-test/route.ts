/**
 * Complete MCP Integration Test
 * Test endpoint to verify all MCP functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { runMCPTests } from '@/lib/mcp/test'
import { OpenAIServiceMCP } from '@/lib/services/openai-mcp'
import { CalendarServiceMCP } from '@/lib/services/calendar-mcp'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running complete MCP integration test...')
    
    const results = {
      infrastructure: false,
      openai: false,
      calendar: false,
      details: {} as any
    }

    // Test 1: MCP Infrastructure
    console.log('1️⃣ Testing MCP Infrastructure...')
    try {
      results.infrastructure = await runMCPTests()
      results.details.infrastructure = { status: 'passed' }
    } catch (error) {
      console.error('❌ MCP Infrastructure test failed:', error)
      results.details.infrastructure = { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: OpenAI MCP Integration
    console.log('2️⃣ Testing OpenAI MCP Integration...')
    try {
      const openaiService = new OpenAIServiceMCP()
      const connectionTest = await openaiService.testConnection()
      const tools = await openaiService.getAvailableTools()
      const resources = await openaiService.getAvailableResources()
      
      results.openai = connectionTest && tools.length > 0
      results.details.openai = {
        status: results.openai ? 'passed' : 'failed',
        connection: connectionTest,
        toolsCount: tools.length,
        resourcesCount: resources.length
      }
    } catch (error) {
      console.error('❌ OpenAI MCP test failed:', error)
      results.details.openai = { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Calendar MCP Integration
    console.log('3️⃣ Testing Calendar MCP Integration...')
    try {
      const calendarService = new CalendarServiceMCP()
      const connectionTest = await calendarService.testConnection()
      const tools = await calendarService.getAvailableTools()
      const resources = await calendarService.getAvailableResources()
      
      // Test scheduling a meeting
      const now = new Date()
      const endTime = new Date(now.getTime() + 60 * 60 * 1000)
      const scheduleResult = await calendarService.scheduleMeeting(
        'MCP Integration Test Meeting',
        now.toISOString(),
        endTime.toISOString(),
        ['test@company.com'],
        'Test meeting for MCP integration verification'
      )
      
      results.calendar = connectionTest && tools.length > 0 && scheduleResult.success
      results.details.calendar = {
        status: results.calendar ? 'passed' : 'failed',
        connection: connectionTest,
        toolsCount: tools.length,
        resourcesCount: resources.length,
        scheduleTest: scheduleResult.success
      }
    } catch (error) {
      console.error('❌ Calendar MCP test failed:', error)
      results.details.calendar = { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Overall result
    const allPassed = results.infrastructure && results.openai && results.calendar
    
    console.log('🎯 MCP Integration Test Results:')
    console.log(`  Infrastructure: ${results.infrastructure ? '✅' : '❌'}`)
    console.log(`  OpenAI: ${results.openai ? '✅' : '❌'}`)
    console.log(`  Calendar: ${results.calendar ? '✅' : '❌'}`)
    console.log(`  Overall: ${allPassed ? '✅' : '❌'}`)

    return NextResponse.json({
      success: allPassed,
      message: allPassed 
        ? 'All MCP integrations are working correctly' 
        : 'Some MCP integrations failed',
      results,
      summary: {
        totalTests: 3,
        passed: [results.infrastructure, results.openai, results.calendar].filter(Boolean).length,
        failed: [results.infrastructure, results.openai, results.calendar].filter(v => !v).length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Complete MCP integration test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'MCP integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
