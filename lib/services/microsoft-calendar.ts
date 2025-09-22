/**
 * Microsoft Graph Calendar Service
 */

export interface MicrosoftCalendarEvent {
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

export interface MicrosoftCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

export class MicrosoftCalendarService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private accessToken?: string
  private refreshToken?: string

  constructor(config: MicrosoftCalendarConfig) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.accessToken = config.accessToken
    this.refreshToken = config.refreshToken
  }

  setAccessToken(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  getAuthUrl(forceAccountSelection: boolean = false): string {
    const base = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: [
        'offline_access',
        'openid',
        'profile',
        'email',
        'Calendars.Read',
        'Calendars.ReadWrite'
      ].join(' '),
      prompt: forceAccountSelection ? 'select_account' : 'consent'
    })
    return `${base}?${params.toString()}`
  }

  async getTokens(code: string): Promise<any> {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri
    })
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Token exchange failed: ${res.status} ${txt}`)
    }
    const tokens = await res.json()
    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token
    return tokens
  }

  private async graph(path: string, init?: RequestInit): Promise<any> {
    if (!this.accessToken) throw new Error('Missing access token')
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Graph error ${res.status}: ${txt}`)
    }
    if (res.status === 204) return null
    return await res.json()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.graph('/me')
      return true
    } catch {
      return false
    }
  }

  async getUpcomingEvents(days: number = 7): Promise<MicrosoftCalendarEvent[]> {
    const start = new Date()
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    return this.getEventsInRange(start.toISOString(), end.toISOString())
  }

  async getEventsInRange(startISO: string, endISO: string): Promise<MicrosoftCalendarEvent[]> {
    const filter = `$filter=start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'&$orderby=start/dateTime`
    const data = await this.graph(`/me/events?${filter}`)
    const items = data.value || []
    return items.map((ev: any) => ({
      id: ev.id,
      title: ev.subject || 'No Title',
      description: ev.bodyPreview || '',
      startTime: ev.start?.dateTime || '',
      endTime: ev.end?.dateTime || '',
      attendees: (ev.attendees || []).map((a: any) => a.emailAddress?.address).filter(Boolean),
      location: ev.location?.displayName || '',
      status: ev.isCancelled ? 'cancelled' : 'confirmed',
      created: ev.createdDateTime || new Date().toISOString(),
      updated: ev.lastModifiedDateTime || new Date().toISOString()
    }))
  }

  async scheduleMeeting(
    title: string,
    startTime: string,
    endTime: string,
    attendees: string[] = [],
    description?: string,
    location?: string
  ): Promise<MicrosoftCalendarEvent> {
    const body = {
      subject: title,
      body: { contentType: 'HTML', content: description || '' },
      start: { dateTime: startTime, timeZone: 'UTC' },
      end: { dateTime: endTime, timeZone: 'UTC' },
      location: { displayName: location || '' },
      attendees: attendees.map(email => ({
        emailAddress: { address: email }, type: 'required'
      }))
    }
    const ev = await this.graph('/me/events', { method: 'POST', body: JSON.stringify(body) })
    return {
      id: ev.id,
      title: ev.subject || title,
      description: ev.bodyPreview || description || '',
      startTime: ev.start?.dateTime || startTime,
      endTime: ev.end?.dateTime || endTime,
      attendees: (ev.attendees || []).map((a: any) => a.emailAddress?.address).filter(Boolean),
      location: ev.location?.displayName || location || '',
      status: 'confirmed',
      created: ev.createdDateTime || new Date().toISOString(),
      updated: ev.lastModifiedDateTime || new Date().toISOString()
    }
  }

  async updateEvent(eventId: string, updates: Partial<MicrosoftCalendarEvent>): Promise<MicrosoftCalendarEvent> {
    const patch: any = {}
    if (updates.title) patch.subject = updates.title
    if (updates.description) patch.body = { contentType: 'HTML', content: updates.description }
    if (updates.location) patch.location = { displayName: updates.location }
    if (updates.startTime) patch.start = { dateTime: updates.startTime, timeZone: 'UTC' }
    if (updates.endTime) patch.end = { dateTime: updates.endTime, timeZone: 'UTC' }
    if (updates.attendees) patch.attendees = updates.attendees.map(email => ({ emailAddress: { address: email }, type: 'required' }))

    await this.graph(`/me/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    // Read back
    const ev = await this.graph(`/me/events/${eventId}`)
    return {
      id: ev.id,
      title: ev.subject || '',
      description: ev.bodyPreview || '',
      startTime: ev.start?.dateTime || '',
      endTime: ev.end?.dateTime || '',
      attendees: (ev.attendees || []).map((a: any) => a.emailAddress?.address).filter(Boolean),
      location: ev.location?.displayName || '',
      status: ev.isCancelled ? 'cancelled' : 'confirmed',
      created: ev.createdDateTime || new Date().toISOString(),
      updated: ev.lastModifiedDateTime || new Date().toISOString()
    }
  }

  async cancelEvent(eventId: string): Promise<boolean> {
    await this.graph(`/me/events/${eventId}`, { method: 'DELETE' })
    return true
  }
}


