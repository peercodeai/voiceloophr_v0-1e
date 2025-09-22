/**
 * Google Calendar Service
 * Real Google Calendar API integration using googleapis library
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { GoogleCalendarEvent, GoogleCalendarListResponse } from '@/lib/types/services'

export interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client
  private calendar: ReturnType<typeof google.calendar>

  constructor(config: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )

    if (config.accessToken) {
      this.oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken
      })
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(forceAccountSelection: boolean = false): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: forceAccountSelection ? 'select_account' : 'consent'
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    return tokens
  }

  /**
   * Test connection to Google Calendar
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.calendar.calendarList.list()
      return true
    } catch (error) {
      console.error('Google Calendar connection test failed:', error)
      return false
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days: number = 7): Promise<GoogleCalendarEvent[]> {
    try {
      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.data.items || []
      
      return events.map((event: GoogleCalendarEvent) => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        startTime: event.start?.dateTime || event.start?.date || '',
        endTime: event.end?.dateTime || event.end?.date || '',
        attendees: event.attendees?.map(attendee => attendee.email) || [],
        location: event.location || '',
        status: event.status === 'confirmed' ? 'confirmed' : 
                event.status === 'tentative' ? 'tentative' : 'cancelled',
        created: event.created || new Date().toISOString(),
        updated: event.updated || new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get upcoming events:', error)
      throw new Error('Failed to fetch calendar events')
    }
  }

  /**
   * Get events within a date range
   */
  async getEventsInRange(startISO: string, endISO: string): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startISO,
        timeMax: endISO,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.data.items || []
      return events.map((event: any) => ({
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description || '',
        startTime: event.start?.dateTime || event.start?.date || '',
        endTime: event.end?.dateTime || event.end?.date || '',
        attendees: event.attendees?.map(attendee => attendee.email) || [],
        location: event.location || '',
        status: event.status === 'confirmed' ? 'confirmed' : 
                event.status === 'tentative' ? 'tentative' : 'cancelled',
        created: event.created || new Date().toISOString(),
        updated: event.updated || new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get events in range:', error)
      throw new Error('Failed to fetch calendar events')
    }
  }

  /**
   * Get public holidays for a given region within a date range
   * Uses Google public holiday calendars (e.g., en.usa#holiday@group.v.calendar.google.com)
   */
  async getHolidaysInRange(calendarId: string, startISO: string, endISO: string): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startISO,
        timeMax: endISO,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.data.items || []
      return events.map((event: any) => ({
        id: `holiday_${event.id}`,
        title: event.summary || 'Holiday',
        description: event.description || '',
        startTime: event.start?.dateTime || event.start?.date || '',
        endTime: event.end?.dateTime || event.end?.date || '',
        attendees: [],
        location: event.location || '',
        status: 'confirmed',
        created: event.created || new Date().toISOString(),
        updated: event.updated || new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get holidays:', error)
      return []
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
  ): Promise<GoogleCalendarEvent> {
    try {
      // Ensure auth has access token set
      const creds = await this.oauth2Client.getAccessToken()
      const event = {
        summary: title,
        description: description || '',
        location: location || '',
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: true
        }
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      })

      const createdEvent = response.data
      
      return {
        id: createdEvent.id!,
        title: createdEvent.summary || title,
        description: createdEvent.description || description || '',
        startTime: createdEvent.start?.dateTime || startTime,
        endTime: createdEvent.end?.dateTime || endTime,
        attendees: createdEvent.attendees?.map((attendee: any) => attendee.email) || attendees,
        location: createdEvent.location || location || '',
        status: 'confirmed',
        created: createdEvent.created || new Date().toISOString(),
        updated: createdEvent.updated || new Date().toISOString()
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
    updates: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    try {
      // First get the existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: 'primary',
        eventId
      })

      const updatedEvent = {
        ...existingEvent.data,
        summary: updates.title || existingEvent.data.summary,
        description: updates.description || existingEvent.data.description,
        location: updates.location || existingEvent.data.location,
        start: updates.startTime ? {
          dateTime: updates.startTime,
          timeZone: 'UTC'
        } : existingEvent.data.start,
        end: updates.endTime ? {
          dateTime: updates.endTime,
          timeZone: 'UTC'
        } : existingEvent.data.end,
        attendees: updates.attendees ? 
          updates.attendees.map(email => ({ email })) : 
          existingEvent.data.attendees
      }

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updatedEvent
      })

      const event = response.data
      
      return {
        id: event.id!,
        title: event.summary || '',
        description: event.description || '',
        startTime: event.start?.dateTime || '',
        endTime: event.end?.dateTime || '',
        attendees: event.attendees?.map(attendee => attendee.email) || [],
        location: event.location || '',
        status: 'confirmed',
        created: event.created || new Date().toISOString(),
        updated: event.updated || new Date().toISOString()
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
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
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
