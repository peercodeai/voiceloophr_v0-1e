/**
 * Calendar Service with MCP Integration
 * Provides calendar functionality using MCP Client
 */

import { mcpClient } from '@/lib/mcp/client'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
}

export interface CalendarMCPConfig {
  serverUrl?: string
  timeout?: number
  retries?: number
}

export class CalendarServiceMCP {
  private config: CalendarMCPConfig

  constructor(config: CalendarMCPConfig = {}) {
    this.config = {
      serverUrl: process.env.CALENDAR_MCP_SERVER_URL || 'http://localhost:3000/api/mcp/calendar',
      timeout: 30000,
      retries: 3,
      ...config
    }

    // Register Calendar MCP Server
    mcpClient.registerServer('calendar', {
      name: 'calendar-mcp-server',
      url: this.config.serverUrl!,
      timeout: this.config.timeout,
      retries: this.config.retries
    })
  }

  /**
   * Schedule a new meeting
   */
  async scheduleMeeting(
    title: string,
    startTime: string,
    endTime: string,
    attendees: string[] = [],
    description?: string,
    location?: string,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/scheduleMeeting', {
        title,
        description,
        startTime,
        endTime,
        attendees,
        location,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar scheduling failed:', error)
      throw new Error(`Meeting scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Find free time slots for attendees
   */
  async findFreeTime(
    attendees: string[],
    duration: number,
    startDate: string,
    endDate: string,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/findFreeTime', {
        attendees,
        duration,
        startDate,
        endDate,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar free time search failed:', error)
      throw new Error(`Free time search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List calendar events
   */
  async listEvents(
    startDate: string,
    endDate: string,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/listEvents', {
        startDate,
        endDate,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar events listing failed:', error)
      throw new Error(`Events listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/updateEvent', {
        eventId,
        updates,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar event update failed:', error)
      throw new Error(`Event update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(
    eventId: string,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/cancelEvent', {
        eventId,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar event cancellation failed:', error)
      throw new Error(`Event cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get event details
   */
  async getEvent(
    eventId: string,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('calendar', 'calendar/getEvent', {
        eventId,
        provider
      })

      return result
    } catch (error) {
      console.error('MCP Calendar event retrieval failed:', error)
      throw new Error(`Event retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(
    days: number = 7,
    provider?: 'google' | 'outlook'
  ): Promise<any> {
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)
    
    return this.listEvents(
      startDate.toISOString(),
      endDate.toISOString(),
      provider
    )
  }

  /**
   * Get available tools from Calendar MCP Server
   */
  async getAvailableTools(): Promise<any[]> {
    try {
      return await mcpClient.listTools('calendar')
    } catch (error) {
      console.error('Failed to get Calendar tools:', error)
      return []
    }
  }

  /**
   * Get available resources from Calendar MCP Server
   */
  async getAvailableResources(): Promise<any[]> {
    try {
      return await mcpClient.listResources('calendar')
    } catch (error) {
      console.error('Failed to get Calendar resources:', error)
      return []
    }
  }

  /**
   * Test MCP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await mcpClient.sendRequest('calendar', 'ping')
      return true
    } catch (error) {
      console.error('MCP connection test failed:', error)
      return false
    }
  }
}
