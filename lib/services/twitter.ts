export interface TwitterTokens {
  access_token: string
  token_type: string
  expires_in?: number
  user_id: string
  user_name: string
  username: string
  service: string
  expires_at: number
}

export interface TwitterTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  public_metrics?: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
  }
}

export interface TwitterDM {
  id: string
  text: string
  sender_id: string
  created_at: string
  attachments?: any[]
}

export interface TwitterSpace {
  id: string
  state: string
  title: string
  created_at: string
  started_at?: string
  ended_at?: string
  participant_count?: number
  speaker_count?: number
  host_ids: string[]
}

export class TwitterService {
  private tokens: TwitterTokens

  constructor(tokens: TwitterTokens) {
    this.tokens = tokens
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`https://api.twitter.com/2/${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`)
    }

    return response.json()
  }

  async getProfile() {
    return this.makeRequest('users/me', {
      'user.fields': 'id,name,username,public_metrics,created_at'
    })
  }

  async getTweets(userId?: string, limit: number = 25) {
    const targetUserId = userId || this.tokens.user_id
    return this.makeRequest(`users/${targetUserId}/tweets`, {
      'tweet.fields': 'id,text,created_at,public_metrics,author_id',
      'max_results': limit.toString()
    })
  }

  async getMentions(limit: number = 25) {
    return this.makeRequest(`users/${this.tokens.user_id}/mentions`, {
      'tweet.fields': 'id,text,created_at,public_metrics,author_id',
      'max_results': limit.toString()
    })
  }

  async getDMs(limit: number = 25) {
    try {
      // Note: This requires elevated access and specific permissions
      return this.makeRequest('dm_events', {
        'dm_event.fields': 'id,text,created_at,sender_id,attachments',
        'max_results': limit.toString()
      })
    } catch (error) {
      console.error('Error fetching DMs:', error)
      throw new Error('Failed to fetch DMs. This may require elevated Twitter API access.')
    }
  }

  async getSpaces(query?: string, limit: number = 25) {
    try {
      const params: Record<string, string> = {
        'space.fields': 'id,state,title,created_at,started_at,ended_at,participant_count,speaker_count,host_ids',
        'max_results': limit.toString()
      }
      
      if (query) {
        params['query'] = query
      }

      return this.makeRequest('spaces/search', params)
    } catch (error) {
      console.error('Error fetching Spaces:', error)
      throw new Error('Failed to fetch Twitter Spaces.')
    }
  }

  async getUserSpaces(userId?: string, limit: number = 25) {
    const targetUserId = userId || this.tokens.user_id
    try {
      return this.makeRequest(`users/${targetUserId}/spaces`, {
        'space.fields': 'id,state,title,created_at,started_at,ended_at,participant_count,speaker_count,host_ids',
        'max_results': limit.toString()
      })
    } catch (error) {
      console.error('Error fetching user Spaces:', error)
      throw new Error('Failed to fetch user Spaces.')
    }
  }

  async postTweet(text: string, replyToId?: string) {
    try {
      const body: any = {
        text: text.substring(0, 280) // Twitter character limit
      }

      if (replyToId) {
        body.reply = {
          in_reply_to_tweet_id: replyToId
        }
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`)
      }

      return response.json()
    } catch (error) {
      console.error('Error posting tweet:', error)
      throw error
    }
  }

  async sendDM(recipientId: string, text: string) {
    try {
      const body = {
        event: {
          type: 'MessageCreate',
          message_create: {
            target: {
              recipient_id: recipientId
            },
            message_data: {
              text: text
            }
          }
        }
      }

      const response = await fetch('https://api.twitter.com/1.1/direct_messages/events/new.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Twitter API error: ${error.errors?.[0]?.message || 'Unknown error'}`)
      }

      return response.json()
    } catch (error) {
      console.error('Error sending DM:', error)
      throw error
    }
  }

  async searchTweets(query: string, limit: number = 25) {
    try {
      return this.makeRequest('tweets/search/recent', {
        'query': query,
        'tweet.fields': 'id,text,created_at,public_metrics,author_id',
        'max_results': limit.toString()
      })
    } catch (error) {
      console.error('Error searching tweets:', error)
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
      username: this.tokens.username,
      expires_at: new Date(this.tokens.expires_at).toISOString(),
      is_expired: this.isTokenExpired()
    }
  }
}

export function createTwitterService(tokens: TwitterTokens): TwitterService {
  return new TwitterService(tokens)
}


