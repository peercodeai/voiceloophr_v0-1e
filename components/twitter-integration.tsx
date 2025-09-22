"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageCircle, Twitter, Users, Clock, Hash, Reply, Heart, Retweet } from 'lucide-react'

interface TwitterTokens {
  access_token: string
  token_type: string
  expires_in?: number
  user_id: string
  user_name: string
  username: string
  service: string
  expires_at: number
}

interface TwitterTweet {
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

interface TwitterDM {
  id: string
  text: string
  sender_id: string
  created_at: string
  attachments?: any[]
}

interface TwitterSpace {
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

export function TwitterIntegration() {
  const [tokens, setTokens] = useState<TwitterTokens | null>(null)
  const [tweets, setTweets] = useState<TwitterTweet[]>([])
  const [dms, setDms] = useState<TwitterDM[]>([])
  const [spaces, setSpaces] = useState<TwitterSpace[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'tweets' | 'dms' | 'spaces'>('tweets')

  useEffect(() => {
    // Check for Twitter tokens
    const twitterTokens = localStorage.getItem('twitter_tokens')
    const dmsTokens = localStorage.getItem('twitter_dms_tokens')
    const spacesTokens = localStorage.getItem('twitter_spaces_tokens')

    if (twitterTokens) {
      setTokens(JSON.parse(twitterTokens))
    }
  }, [])

  const fetchTweets = async () => {
    if (!tokens) return

    setLoading(true)
    try {
      const response = await fetch('/api/twitter/tweets?limit=10', {
        headers: {
          'x-twitter-tokens': JSON.stringify(tokens)
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setTweets(data.data)
      } else {
        console.error('Failed to fetch tweets:', data.error)
      }
    } catch (error) {
      console.error('Error fetching tweets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDMs = async () => {
    if (!tokens) return

    setLoading(true)
    try {
      const response = await fetch('/api/twitter/dms?limit=10', {
        headers: {
          'x-twitter-tokens': JSON.stringify(tokens)
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setDms(data.data)
      } else {
        console.error('Failed to fetch DMs:', data.error)
      }
    } catch (error) {
      console.error('Error fetching DMs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpaces = async () => {
    if (!tokens) return

    setLoading(true)
    try {
      const response = await fetch('/api/twitter/spaces?limit=10', {
        headers: {
          'x-twitter-tokens': JSON.stringify(tokens)
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setSpaces(data.data)
      } else {
        console.error('Failed to fetch spaces:', data.error)
      }
    } catch (error) {
      console.error('Error fetching spaces:', error)
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (!tokens) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Twitter className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Twitter Integration</h3>
          <p className="text-muted-foreground mb-4">
            Connect your Twitter account to access tweets, DMs, and Spaces
          </p>
          <Button 
            onClick={() => window.location.href = '/settings'}
            className="bg-blue-400 hover:bg-blue-500"
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
            <Twitter className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-medium">Twitter Integration</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Connected as: @{tokens.username}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'tweets' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('tweets')
              fetchTweets()
            }}
            disabled={loading}
          >
            <Twitter className="mr-2 h-4 w-4" />
            Tweets
          </Button>
          <Button
            variant={activeTab === 'dms' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('dms')
              fetchDms()
            }}
            disabled={loading}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            DMs
          </Button>
          <Button
            variant={activeTab === 'spaces' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('spaces')
              fetchSpaces()
            }}
            disabled={loading}
          >
            <Users className="mr-2 h-4 w-4" />
            Spaces
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        )}

        {activeTab === 'tweets' && !loading && (
          <div className="space-y-4">
            {tweets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No tweets found.
              </p>
            ) : (
              tweets.map((tweet) => (
                <div key={tweet.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                      <Twitter className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">@{tokens.username}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(tweet.created_at)}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{tweet.text}</p>
                      {tweet.public_metrics && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Reply className="h-3 w-3" />
                            {formatNumber(tweet.public_metrics.reply_count)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Retweet className="h-3 w-3" />
                            {formatNumber(tweet.public_metrics.retweet_count)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatNumber(tweet.public_metrics.like_count)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'dms' && !loading && (
          <div className="space-y-4">
            {dms.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No DMs found. This may require elevated Twitter API access.
              </p>
            ) : (
              dms.map((dm) => (
                <div key={dm.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">DM</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(dm.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{dm.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'spaces' && !loading && (
          <div className="space-y-4">
            {spaces.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No Spaces found.
              </p>
            ) : (
              spaces.map((space) => (
                <div key={space.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{space.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          space.state === 'live' ? 'bg-green-100 text-green-800' :
                          space.state === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {space.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(space.created_at)}
                        </div>
                        {space.participant_count && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {space.participant_count} participants
                          </div>
                        )}
                        {space.speaker_count && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {space.speaker_count} speakers
                          </div>
                        )}
                      </div>
                    </div>
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


