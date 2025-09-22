export interface FacebookTokens {
  access_token: string
  token_type: string
  expires_in?: number
  user_id: string
  user_name: string
  user_email?: string
  service: string
  expires_at: number
}

export interface FacebookMessage {
  id: string
  message: string
  from: {
    id: string
    name: string
  }
  created_time: string
}

export interface FacebookEvent {
  id: string
  name: string
  description?: string
  start_time: string
  end_time?: string
  place?: {
    name: string
    location?: {
      city: string
      country: string
    }
  }
  attending_count?: number
  interested_count?: number
}

export class FacebookService {
  private tokens: FacebookTokens

  constructor(tokens: FacebookTokens) {
    this.tokens = tokens
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`)
    url.searchParams.set('access_token', this.tokens.access_token)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async getProfile() {
    return this.makeRequest('me', {
      fields: 'id,name,email,picture'
    })
  }

  async getPages() {
    return this.makeRequest('me/accounts', {
      fields: 'id,name,access_token,category'
    })
  }

  async getMessages(pageId: string, limit: number = 25) {
    try {
      // Get conversations
      const conversations = await this.makeRequest(`${pageId}/conversations`, {
        fields: 'id,updated_time,message_count',
        limit: limit.toString()
      })

      // Get messages for each conversation
      const messagesWithDetails = await Promise.all(
        conversations.data.map(async (conversation: any) => {
          try {
            const messages = await this.makeRequest(`${conversation.id}/messages`, {
              fields: 'id,message,from,created_time',
              limit: '10'
            })
            return {
              conversation_id: conversation.id,
              message_count: conversation.message_count,
              updated_time: conversation.updated_time,
              messages: messages.data || []
            }
          } catch (error) {
            console.error(`Error fetching messages for conversation ${conversation.id}:`, error)
            return {
              conversation_id: conversation.id,
              message_count: conversation.message_count,
              updated_time: conversation.updated_time,
              messages: [],
              error: 'Failed to fetch messages'
            }
          }
        })
      )

      return {
        data: messagesWithDetails,
        paging: conversations.paging
      }
    } catch (error) {
      console.error('Error fetching Facebook messages:', error)
      throw error
    }
  }

  async getEvents(limit: number = 25) {
    try {
      return this.makeRequest('me/events', {
        fields: 'id,name,description,start_time,end_time,place,attending_count,interested_count',
        limit: limit.toString()
      })
    } catch (error) {
      console.error('Error fetching Facebook events:', error)
      throw error
    }
  }

  async getUpcomingEvents(limit: number = 10) {
    try {
      const now = new Date().toISOString()
      return this.makeRequest('me/events', {
        fields: 'id,name,description,start_time,end_time,place,attending_count,interested_count',
        since: now,
        limit: limit.toString()
      })
    } catch (error) {
      console.error('Error fetching upcoming Facebook events:', error)
      throw error
    }
  }

  async sendMessage(pageId: string, recipientId: string, message: string) {
    try {
      return this.makeRequest(`${pageId}/messages`, {
        recipient: JSON.stringify({ id: recipientId }),
        message: JSON.stringify({ text: message })
      })
    } catch (error) {
      console.error('Error sending Facebook message:', error)
      throw error
    }
  }

  async createEvent(eventData: {
    name: string
    description?: string
    start_time: string
    end_time?: string
    place?: string
  }) {
    try {
      return this.makeRequest('me/events', {
        name: eventData.name,
        description: eventData.description || '',
        start_time: eventData.start_time,
        end_time: eventData.end_time || '',
        place: eventData.place || ''
      })
    } catch (error) {
      console.error('Error creating Facebook event:', error)
      throw error
    }
  }

  isTokenExpired(): boolean {
    return Date.now() >= this.tokens.expires_at
  }

  getTokenInfo() {
    return {
      service: this.tokens.service,
      user_name: this.tokens.user_name,
      user_email: this.tokens.user_email,
      expires_at: new Date(this.tokens.expires_at).toISOString(),
      is_expired: this.isTokenExpired()
    }
  }
}

export function createFacebookService(tokens: FacebookTokens): FacebookService {
  return new FacebookService(tokens)
}


