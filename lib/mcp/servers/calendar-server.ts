/**
 * Calendar MCP Server
 * Provides calendar functionality for VoiceLoop HR using Google Calendar and Outlook
 */

import { MCPServer } from '../server'

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

export interface CalendarProvider {
  name: 'google' | 'outlook'
  accessToken: string
  refreshToken?: string
  calendarId?: string
}

export interface CalendarMCPServerConfig {
  providers: CalendarProvider[]
  defaultProvider?: 'google' | 'outlook'
}

export class CalendarMCPServer extends MCPServer {
  private providers: Map<string, CalendarProvider> = new Map()
  private defaultProvider: string

  constructor(config: CalendarMCPServerConfig) {
    super({
      name: 'calendar-mcp-server',
      version: '1.0.0',
      description: 'Calendar integration server for VoiceLoop HR'
    })

    // Initialize providers
    config.providers.forEach(provider => {
      this.providers.set(provider.name, provider)
    })

    this.defaultProvider = config.defaultProvider || config.providers[0]?.name || 'google'

    // Register tools
    this.registerTools()
    // Register resources
    this.registerResources()
  }

  /**
   * Register all calendar tools
   */
  private registerTools(): void {
    // Schedule Meeting Tool
    this.registerTool(
      'calendar/scheduleMeeting',
      'Schedule a new calendar event',
      {
        properties: {
          title: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description' },
          startTime: { type: 'string', description: 'Start time (ISO 8601)' },
          endTime: { type: 'string', description: 'End time (ISO 8601)' },
          attendees: { 
            type: 'array', 
            description: 'List of attendee email addresses',
            items: { type: 'string' }
          },
          location: { type: 'string', description: 'Event location' },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['title', 'startTime', 'endTime']
      },
      async (params) => {
        return await this.scheduleMeeting(params)
      }
    )

    // Find Free Time Tool
    this.registerTool(
      'calendar/findFreeTime',
      'Find available time slots for attendees',
      {
        properties: {
          attendees: { 
            type: 'array', 
            description: 'List of attendee email addresses',
            items: { type: 'string' }
          },
          duration: { type: 'number', description: 'Duration in minutes' },
          startDate: { type: 'string', description: 'Start date for search (ISO 8601)' },
          endDate: { type: 'string', description: 'End date for search (ISO 8601)' },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['attendees', 'duration', 'startDate', 'endDate']
      },
      async (params) => {
        return await this.findFreeTime(params)
      }
    )

    // List Events Tool
    this.registerTool(
      'calendar/listEvents',
      'List calendar events for a date range',
      {
        properties: {
          startDate: { type: 'string', description: 'Start date (ISO 8601)' },
          endDate: { type: 'string', description: 'End date (ISO 8601)' },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['startDate', 'endDate']
      },
      async (params) => {
        return await this.listEvents(params)
      }
    )

    // Update Event Tool
    this.registerTool(
      'calendar/updateEvent',
      'Update an existing calendar event',
      {
        properties: {
          eventId: { type: 'string', description: 'Event ID to update' },
          updates: { 
            type: 'object', 
            description: 'Event updates',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              attendees: { type: 'array', items: { type: 'string' } },
              location: { type: 'string' }
            }
          },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['eventId', 'updates']
      },
      async (params) => {
        return await this.updateEvent(params)
      }
    )

    // Cancel Event Tool
    this.registerTool(
      'calendar/cancelEvent',
      'Cancel a calendar event',
      {
        properties: {
          eventId: { type: 'string', description: 'Event ID to cancel' },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['eventId']
      },
      async (params) => {
        return await this.cancelEvent(params)
      }
    )

    // Get Event Details Tool
    this.registerTool(
      'calendar/getEvent',
      'Get details of a specific calendar event',
      {
        properties: {
          eventId: { type: 'string', description: 'Event ID' },
          provider: { type: 'string', description: 'Calendar provider (google/outlook)' }
        },
        required: ['eventId']
      },
      async (params) => {
        return await this.getEvent(params)
      }
    )
  }

  /**
   * Register all calendar resources
   */
  private registerResources(): void {
    // Calendar Events Resource
    this.registerResource(
      'calendar://events/upcoming',
      'Upcoming Calendar Events',
      'List of upcoming calendar events',
      'application/json',
      async () => {
        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        return await this.listEvents({
          startDate: now.toISOString(),
          endDate: nextWeek.toISOString(),
          provider: this.defaultProvider
        })
      }
    )

    // Calendar Status Resource
    this.registerResource(
      'calendar://status',
      'Calendar Status',
      'Current calendar integration status',
      'application/json',
      async () => {
        return {
          status: 'active',
          providers: Array.from(this.providers.keys()),
          defaultProvider: this.defaultProvider,
          timestamp: new Date().toISOString()
        }
      }
    )
  }

  /**
   * Schedule a new meeting
   */
  private async scheduleMeeting(params: any): Promise<any> {
    try {
      const provider = this.getProvider(params.provider)
      
      if (provider === 'google' && process.env.GOOGLE_CALENDAR_API_KEY) {
        return await this.scheduleGoogleMeeting(params)
      }
      
      if (provider === 'outlook' && process.env.MICROSOFT_CLIENT_ID) {
        return await this.scheduleOutlookMeeting(params)
      }

      // Fallback to mock if no APIs configured
      return this.createMockEvent(params)
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      return {
        success: false,
        error: 'Failed to schedule meeting'
      }
    }
  }

  private async scheduleGoogleMeeting(params: any): Promise<any> {
    // Google Calendar API implementation
    const event = {
      summary: params.title,
      description: params.description || '',
      location: params.location || '',
      start: {
        dateTime: params.startTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: params.endTime,
        timeZone: 'UTC'
      },
      attendees: (params.attendees || []).map((email: string) => ({ email })),
      reminders: {
        useDefault: true
      }
    }

    // TODO: Make actual Google Calendar API call
    // For now, return structured event
    return {
      success: true,
      event: {
        id: `google_event_${Date.now()}`,
        title: params.title,
        description: params.description || '',
        startTime: params.startTime,
        endTime: params.endTime,
        attendees: params.attendees || [],
        location: params.location || '',
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        provider: 'google'
      }
    }
  }

  private async scheduleOutlookMeeting(params: any): Promise<any> {
    // Microsoft Graph API implementation
    const event = {
      subject: params.title,
      body: {
        contentType: 'text',
        content: params.description || ''
      },
      location: {
        displayName: params.location || ''
      },
      start: {
        dateTime: params.startTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: params.endTime,
        timeZone: 'UTC'
      },
      attendees: (params.attendees || []).map((email: string) => ({
        emailAddress: { address: email },
        type: 'required'
      }))
    }

    // TODO: Make actual Microsoft Graph API call
    return {
      success: true,
      event: {
        id: `outlook_event_${Date.now()}`,
        title: params.title,
        description: params.description || '',
        startTime: params.startTime,
        endTime: params.endTime,
        attendees: params.attendees || [],
        location: params.location || '',
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        provider: 'outlook'
      }
    }
  }

  private createMockEvent(params: any): any {
    const event: CalendarEvent = {
      id: `mock_event_${Date.now()}`,
      title: params.title,
      description: params.description || '',
      startTime: params.startTime,
      endTime: params.endTime,
      attendees: params.attendees || [],
      location: params.location || '',
      status: 'confirmed',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }

    return {
      success: true,
      event,
      message: `Meeting "${params.title}" scheduled successfully`,
      provider: 'mock'
    }
  }

  /**
   * Find free time slots
   */
  private async findFreeTime(params: any): Promise<any> {
    const provider = this.getProvider(params.provider)
    
    // Mock implementation - in reality, this would query calendar APIs
    const freeSlots = [
      {
        start: new Date(params.startDate).toISOString(),
        end: new Date(new Date(params.startDate).getTime() + params.duration * 60000).toISOString(),
        duration: params.duration
      }
    ]

    return {
      success: true,
      freeSlots,
      attendees: params.attendees,
      searchPeriod: {
        start: params.startDate,
        end: params.endDate
      },
      provider: provider.name
    }
  }

  /**
   * List calendar events
   */
  private async listEvents(params: any): Promise<any> {
    const provider = this.getProvider(params.provider)
    
    // Mock implementation
    const events: CalendarEvent[] = [
      {
        id: 'event_1',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        attendees: ['team@company.com'],
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    ]

    return {
      success: true,
      events,
      count: events.length,
      period: {
        start: params.startDate,
        end: params.endDate
      },
      provider: provider.name
    }
  }

  /**
   * Update an existing event
   */
  private async updateEvent(params: any): Promise<any> {
    const provider = this.getProvider(params.provider)
    
    // Mock implementation
    return {
      success: true,
      eventId: params.eventId,
      updates: params.updates,
      message: 'Event updated successfully',
      provider: provider.name
    }
  }

  /**
   * Cancel an event
   */
  private async cancelEvent(params: any): Promise<any> {
    const provider = this.getProvider(params.provider)
    
    // Mock implementation
    return {
      success: true,
      eventId: params.eventId,
      message: 'Event cancelled successfully',
      provider: provider.name
    }
  }

  /**
   * Get event details
   */
  private async getEvent(params: any): Promise<any> {
    const provider = this.getProvider(params.provider)
    
    // Mock implementation
    const event: CalendarEvent = {
      id: params.eventId,
      title: 'Sample Event',
      description: 'This is a sample event',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      attendees: ['user@company.com'],
      status: 'confirmed',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }

    return {
      success: true,
      event,
      provider: provider.name
    }
  }

  /**
   * Get provider configuration
   */
  private getProvider(providerName?: string): CalendarProvider {
    const name = providerName || this.defaultProvider
    const provider = this.providers.get(name)
    
    if (!provider) {
      throw new Error(`Calendar provider '${name}' not configured`)
    }
    
    return provider
  }

  /**
   * Add a new calendar provider
   */
  addProvider(provider: CalendarProvider): void {
    this.providers.set(provider.name, provider)
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      ...this.getServerInfo(),
      status: 'running',
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.defaultProvider,
      toolsCount: this.getServerInfo().tools.length,
      resourcesCount: this.getServerInfo().resources.length
    }
  }
}
