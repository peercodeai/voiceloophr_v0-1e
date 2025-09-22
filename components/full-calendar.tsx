"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Plus,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  CalendarDays,
  List
} from "lucide-react"
import { GoogleAccountSelector } from "@/components/google-account-selector"

interface CalendarEvent {
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

type ViewMode = 'month' | 'week' | 'day'

interface FullCalendarProps {
  className?: string
}

export function FullCalendar({ className = "" }: FullCalendarProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [provider, setProvider] = useState<'google' | 'microsoft'>('google')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [editForm, setEditForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: ''
  })

  // Store both providers' tokens so both connections can persist
  const [googleTokens, setGoogleTokens] = useState<{ access_token: string; refresh_token?: string } | null>(null)
  const [microsoftTokens, setMicrosoftTokens] = useState<{ access_token: string; refresh_token?: string } | null>(null)

  // Load user authentication state and listen for changes
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch (error) {
        console.error('Error loading user:', error)
        setUserId(null)
      }
    }
    loadUser()

    // Listen for auth state changes
    const supabase = getSupabaseBrowser()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUserId(null)
          // Clear all calendar data when user signs out
          setIsConnected(false)
          setEvents([])
          setEventsByDate({})
          setConnectedProviders([])
          setAccessToken(null)
          setRefreshToken(null)
          setError('Please sign in to view calendar events')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUserId(session.user.id)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (userId) {
      checkConnection()
      loadStoredTokens()
    }
  }, [userId])

  // Load events when view or date changes
  useEffect(() => {
    if (isConnected && accessToken) {
      loadEventsForCurrentView()
    }
  }, [isConnected, accessToken, currentDate, viewMode])

  const checkConnection = async () => {
    try {
      // Test provider availability (google by default)
      const response = await fetch('/api/calendar/auth/google', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsConnected(true)
          setConnectedProviders(
            [{ id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }]
          )
          loadEventsForCurrentView()
        }
      }
    } catch (error) {
      console.error('Calendar connection check failed:', error)
    }
  }

  const loadStoredTokens = () => {
    try {
      // Load both providers' tokens from localStorage
      const g = localStorage.getItem('google_calendar_tokens')
      const m = localStorage.getItem('microsoft_calendar_tokens')
      const providers: any[] = []
      
      if (g) {
        const t = JSON.parse(g)
        setGoogleTokens({ access_token: t.access_token, refresh_token: t.refresh_token })
        providers.push({ id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' })
      }
      
      if (m) {
        const t = JSON.parse(m)
        setMicrosoftTokens({ access_token: t.access_token, refresh_token: t.refresh_token })
        providers.push({ id: 'microsoft', name: 'Microsoft Calendar', type: 'microsoft', status: 'connected' })
      }
      
      if (providers.length > 0) {
        setIsConnected(true)
        setConnectedProviders(providers)
        const defaultProvider: 'google' | 'microsoft' = providers.find(p => p.id === 'google') ? 'google' : 'microsoft'
        setProvider(defaultProvider)
        const defTokens = defaultProvider === 'google' ? g && JSON.parse(g) : m && JSON.parse(m)
        if (defTokens) {
          setAccessToken(defTokens.access_token)
          setRefreshToken(defTokens.refresh_token || null)
          loadRealEvents()
          loadEventsForCurrentView()
        }
      }
    } catch (error) {
      console.error('Failed to parse stored tokens:', error)
    }
  }

  const loadEventsForCurrentView = async () => {
    if (!accessToken) return

    let start: string, end: string
    const date = new Date(currentDate)

    switch (viewMode) {
      case 'day':
        start = date.toISOString().split('T')[0]
        end = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        start = weekStart.toISOString().split('T')[0]
        end = weekEnd.toISOString().split('T')[0]
        break
      case 'month':
      default:
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        start = monthStart.toISOString().split('T')[0]
        end = monthEnd.toISOString().split('T')[0]
        break
    }

    try {
      const response = await fetch(`/api/calendar/events?start=${start}&end=${end}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.events) {
          const map: Record<string, CalendarEvent[]> = {}
          data.events.forEach((event: any) => {
            const dateKey = event.startTime.split('T')[0]
            if (!map[dateKey]) map[dateKey] = []
            map[dateKey].push(event)
          })
          setEventsByDate(map)
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const loadRealEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      const data = await response.json()
      
      if (data.success && data.events) {
        setEvents(data.events)
        setError(`✅ ${data.message}`)
      } else {
        setError(`❌ Failed to load events: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to load real events:', error)
      setError('❌ Failed to load events')
    }
  }

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accessToken || !editForm.title || !editForm.startTime || !editForm.endTime) {
      setError('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          location: editForm.location,
          attendees: []
        })
      })

      const data = await response.json()

      if (data.success) {
        setError(`✅ ${data.message}`)
        setEditForm({ title: '', description: '', startTime: '', endTime: '', location: '' })
        setShowScheduleForm(false)
        
        // Refresh events
        loadRealEvents()
        loadEventsForCurrentView()
      } else {
        setError(`❌ Failed to schedule meeting: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      setError('❌ Failed to schedule meeting')
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    localStorage.removeItem('google_calendar_tokens')
    localStorage.removeItem('microsoft_calendar_tokens')
    setIsConnected(false)
    setConnectedProviders([])
    setEvents([])
    setEventsByDate({})
    setError('Disconnected from Calendar')
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getEventsForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    return eventsByDate[dateKey] || []
  }

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDate = new Date(startOfMonth)
    startDate.setDate(startDate.getDate() - startOfMonth.getDay())
    const endDate = new Date(endOfMonth)
    endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()))

    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()
          const dayEvents = getEventsForDate(day)
          
          return (
            <div
              key={index}
              className={`min-h-[100px] p-1 border-b border-r cursor-pointer hover:bg-muted/50 ${
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
              } ${isToday ? 'bg-primary/10' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                {day.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                    title={event.title}
                  >
                    {formatTime(event.startTime)} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderEventList = () => {
    const allEvents = Object.values(eventsByDate).flat().sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    return (
      <div className="space-y-2">
        {allEvents.map(event => (
          <div key={event.id} className="p-3 border rounded-lg hover:bg-muted/50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{event.title}</h4>
                <div className="text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-3 w-3" />
                      {event.attendees.length} attendees
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="ml-2">
                {event.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <Card className={`p-6 border-dashed border-2 border-muted-foreground/25 ${className}`}>
        <div className="flex items-center gap-3 text-muted-foreground mb-4">
          <Calendar className="h-6 w-6" />
          <div>
            <p className="font-medium">Calendar Integration</p>
            <p className="text-sm">
              {userId 
                ? "Connect your calendar to view and schedule events" 
                : "Please sign in to access calendar features"
              }
            </p>
          </div>
        </div>
        
        {userId && (
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowAuthModal(true)}
              disabled={isLoading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-light text-foreground">Calendar</h2>
          <div className="flex items-center gap-2">
            {connectedProviders.map(provider => (
              <Badge key={provider.id} variant="outline" className="text-green-600 border-green-600/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                {provider.name}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <div className="flex items-center gap-1 border rounded">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => { checkConnection(); if (isConnected && accessToken) { loadEventsForCurrentView() } }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            disabled={!isConnected}
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-3 rounded-md ${error.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}

      {/* Schedule Meeting Form */}
      {showScheduleForm && isConnected && (
        <Card className="p-6 border-primary/20">
          <h3 className="font-semibold mb-4">Schedule New Meeting</h3>
          <form onSubmit={scheduleMeeting} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time *</label>
                <input
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time *</label>
                <input
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowScheduleForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="p-6">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && <div>Week view coming soon...</div>}
        {viewMode === 'day' && <div>Day view coming soon...</div>}
      </Card>

      {/* Event List */}
      {viewMode === 'day' && renderEventList()}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card text-foreground rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Connect Calendar</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAuthModal(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <GoogleAccountSelector
              onAccountSelected={(account) => {
                console.log('Selected account:', account)
                setShowAuthModal(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}