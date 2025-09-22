"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageCircle, Calendar, Users, Clock, MapPin } from 'lucide-react'

interface FacebookTokens {
  access_token: string
  token_type: string
  expires_in?: number
  user_id: string
  user_name: string
  user_email?: string
  service: string
  expires_at: number
}

interface FacebookMessage {
  conversation_id: string
  message_count: number
  updated_time: string
  messages: Array<{
    id: string
    message: string
    from: {
      id: string
      name: string
    }
    created_time: string
  }>
}

interface FacebookEvent {
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

export function FacebookIntegration() {
  const [tokens, setTokens] = useState<FacebookTokens | null>(null)
  const [messages, setMessages] = useState<FacebookMessage[]>([])
  const [events, setEvents] = useState<FacebookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'events'>('messages')

  useEffect(() => {
    // Check for Facebook tokens
    const facebookTokens = localStorage.getItem('facebook_tokens')
    const messagesTokens = localStorage.getItem('facebook_messages_tokens')
    const eventsTokens = localStorage.getItem('facebook_events_tokens')

    if (facebookTokens) {
      setTokens(JSON.parse(facebookTokens))
    }
  }, [])

  const fetchMessages = async () => {
    if (!tokens) return

    setLoading(true)
    try {
      const response = await fetch('/api/facebook/messages?limit=10', {
        headers: {
          'x-facebook-tokens': JSON.stringify(tokens)
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data)
      } else {
        console.error('Failed to fetch messages:', data.error)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    if (!tokens) return

    setLoading(true)
    try {
      const response = await fetch('/api/facebook/events?limit=10&upcoming=true', {
        headers: {
          'x-facebook-tokens': JSON.stringify(tokens)
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.data)
      } else {
        console.error('Failed to fetch events:', data.error)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!tokens) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Facebook Integration</h3>
          <p className="text-muted-foreground mb-4">
            Connect your Facebook account to access messages and events
          </p>
          <Button 
            onClick={() => window.location.href = '/settings'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Settings
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Facebook Integration</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Connected as: {tokens.user_name}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'messages' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('messages')
              fetchMessages()
            }}
            disabled={loading}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Messages
          </Button>
          <Button
            variant={activeTab === 'events' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('events')
              fetchEvents()
            }}
            disabled={loading}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Events
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        )}

        {activeTab === 'messages' && !loading && (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No messages found. Make sure you have a Facebook page connected.
              </p>
            ) : (
              messages.map((conversation) => (
                <div key={conversation.conversation_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Conversation</span>
                    <span className="text-sm text-muted-foreground">
                      {conversation.message_count} messages
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Last updated: {formatDate(conversation.updated_time)}
                  </div>
                  {conversation.messages.slice(0, 2).map((message) => (
                    <div key={message.id} className="bg-muted/50 rounded p-2 mb-2">
                      <div className="text-sm font-medium">{message.from.name}</div>
                      <div className="text-sm">{message.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(message.created_time)}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && !loading && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No upcoming events found.
              </p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{event.name}</h4>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(event.start_time)}
                    </div>
                    {event.place && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.place.name}
                      </div>
                    )}
                    {event.attending_count && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.attending_count} attending
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  )
}


