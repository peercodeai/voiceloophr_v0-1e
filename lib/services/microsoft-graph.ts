/**
 * Microsoft Graph Service
 * Real Microsoft Graph API integration for Outlook Calendar
 */

import { ConfidentialClientApplication } from '@azure/msal-node'
import axios from 'axios'

export interface MicrosoftGraphEvent {
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

export interface MicrosoftGraphConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

export class MicrosoftGraphService {
  private msalApp: ConfidentialClientApplication
  private accessToken?: string
  private refreshToken?: string

  constructor(config: MicrosoftGraphConfig) {
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`
      }
    })

    this.accessToken = config.accessToken
    this.refreshToken = config.refreshToken
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(): string {
    const authCodeUrlParameters = {
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/microsoft`,
    }

    return this.msalApp.getAuthCodeUrl(authCodeUrlParameters)
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const tokenRequest = {
      code: code,
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/microsoft`,
    }

    const response = await this.msalApp.acquireTokenByCode(tokenRequest)
    this.accessToken = response.accessToken
    this.refreshToken = response.refreshToken

    return {
      access_token: response.accessToken,
      refresh_token: response.refreshToken,
      expires_in: response.expiresOn?.getTime() || 3600
    }
  }

  /**
   * Test connection to Microsoft Graph
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false
      }

      const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      return response.status === 200
    } catch (error) {
      console.error('Microsoft Graph connection test failed:', error)
      return false
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days: number = 7): Promise<MicrosoftGraphEvent[]> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const startTime = new Date().toISOString()
      const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

      const response = await axios.get('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params: {
          $filter: `start/dateTime ge '${startTime}' and start/dateTime le '${endTime}'`,
          $orderby: 'start/dateTime',
          $select: 'id,subject,body,start,end,attendees,location,isCancelled,createdDateTime,lastModifiedDateTime'
        }
      })

      const events = response.data.value || []
      
      return events.map((event: any) => ({
        id: event.id,
        title: event.subject || 'No Title',
        description: event.body?.content || '',
        startTime: event.start?.dateTime || '',
        endTime: event.end?.dateTime || '',
        attendees: event.attendees?.map((attendee: any) => attendee.emailAddress?.address).filter(Boolean) || [],
        location: event.location?.displayName || '',
        status: event.isCancelled ? 'cancelled' : 'confirmed',
        created: event.createdDateTime || new Date().toISOString(),
        updated: event.lastModifiedDateTime || new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get upcoming events:', error)
      throw new Error('Failed to fetch calendar events')
    }
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
    location?: string
  ): Promise<MicrosoftGraphEvent> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const event = {
        subject: title,
        body: {
          contentType: 'text',
          content: description || ''
        },
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({
          emailAddress: { address: email }
        })),
        location: location ? {
          displayName: location
        } : undefined
      }

      const response = await axios.post('https://graph.microsoft.com/v1.0/me/events', event, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const createdEvent = response.data
      
      return {
        id: createdEvent.id,
        title: createdEvent.subject || title,
        description: createdEvent.body?.content || description || '',
        startTime: createdEvent.start?.dateTime || startTime,
        endTime: createdEvent.end?.dateTime || endTime,
        attendees: createdEvent.attendees?.map((attendee: any) => attendee.emailAddress?.address).filter(Boolean) || attendees,
        location: createdEvent.location?.displayName || location || '',
        status: 'confirmed',
        created: createdEvent.createdDateTime || new Date().toISOString(),
        updated: createdEvent.lastModifiedDateTime || new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      throw new Error('Failed to schedule meeting')
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<MicrosoftGraphEvent>
  ): Promise<MicrosoftGraphEvent> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const updateData: any = {}
      
      if (updates.title) updateData.subject = updates.title
      if (updates.description) updateData.body = { contentType: 'text', content: updates.description }
      if (updates.location) updateData.location = { displayName: updates.location }
      if (updates.startTime) updateData.start = { dateTime: updates.startTime, timeZone: 'UTC' }
      if (updates.endTime) updateData.end = { dateTime: updates.endTime, timeZone: 'UTC' }
      if (updates.attendees) updateData.attendees = updates.attendees.map(email => ({ emailAddress: { address: email } }))

      const response = await axios.patch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, updateData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const event = response.data
      
      return {
        id: event.id,
        title: event.subject || '',
        description: event.body?.content || '',
        startTime: event.start?.dateTime || '',
        endTime: event.end?.dateTime || '',
        attendees: event.attendees?.map((attendee: any) => attendee.emailAddress?.address).filter(Boolean) || [],
        location: event.location?.displayName || '',
        status: 'confirmed',
        created: event.createdDateTime || new Date().toISOString(),
        updated: event.lastModifiedDateTime || new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update event:', error)
      throw new Error('Failed to update event')
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      await axios.delete(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      return true
    } catch (error) {
      console.error('Failed to cancel event:', error)
      throw new Error('Failed to cancel event')
    }
  }

  /**
   * Find free time slots
   */
  async findFreeTime(
    attendees: string[],
    duration: number,
    startDate: string,
    endDate: string
  ): Promise<Array<{ start: string; end: string; duration: number }>> {
    try {
      // This is a simplified implementation
      // In a real app, you'd use the Calendar API's freebusy endpoint
      const freeSlots = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Generate hourly slots for the next 7 days
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (let h = 9; h < 17; h++) { // Business hours 9 AM to 5 PM
          const slotStart = new Date(d)
          slotStart.setHours(h, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + duration * 60000)
          
          freeSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration
          })
        }
      }
      
      return freeSlots
    } catch (error) {
      console.error('Failed to find free time:', error)
      throw new Error('Failed to find free time')
    }
  }
}
