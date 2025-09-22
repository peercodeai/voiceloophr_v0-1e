"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react"
import { SophisticatedLoader } from "@/components/sophisticated-loader"
import { CalendarServiceMCP } from "@/lib/services/calendar-mcp"

interface CalendarIntegrationProps {
  documentId: string
  documentTitle: string
  documentContent?: string
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

export function CalendarIntegration({ 
  documentId, 
  documentTitle, 
  documentContent 
}: CalendarIntegrationProps) {
  const [calendarService] = useState(() => new CalendarServiceMCP())
  const [isConnected, setIsConnected] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // Form state for scheduling
  const [scheduleForm, setScheduleForm] = useState({
    title: `Meeting about ${documentTitle}`,
    description: `Discussion about: ${documentTitle}`,
    startTime: '',
    endTime: '',
    attendees: '',
    location: ''
  })

  useEffect(() => {
    checkConnection()
    loadUpcomingEvents()
  }, [])

  const checkConnection = async () => {
    try {
      const connected = await calendarService.testConnection()
      setIsConnected(connected)
    } catch (error) {
      console.error('Calendar connection check failed:', error)
      setIsConnected(false)
    }
  }

  const loadUpcomingEvents = async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await calendarService.getUpcomingEvents(7) // Next 7 days
      if (result.success && result.events) {
        setUpcomingEvents(result.events)
      }
    } catch (error) {
      console.error('Failed to load upcoming events:', error)
      setError('Failed to load calendar events')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setError('Please provide start and end times')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const attendees = scheduleForm.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email)

      const result = await calendarService.scheduleMeeting(
        scheduleForm.title,
        scheduleForm.startTime,
        scheduleForm.endTime,
        attendees,
        scheduleForm.description,
        scheduleForm.location
      )

      if (result.success) {
        setShowScheduleForm(false)
        setScheduleForm({
          title: `Meeting about ${documentTitle}`,
          description: `Discussion about: ${documentTitle}`,
          startTime: '',
          endTime: '',
          attendees: '',
          location: ''
        })
        loadUpcomingEvents() // Refresh events
      } else {
        setError('Failed to schedule meeting')
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      setError('Failed to schedule meeting')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString()
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!isConnected) {
    return (
      <Card className="p-4 border-dashed border-2 border-muted-foreground/25">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <div>
            <p className="font-medium">Calendar Integration</p>
            <p className="text-sm">Connect your calendar to schedule meetings about this document</p>
          </div>
        </div>
        <Button 
          className="mt-3" 
          variant="outline" 
          onClick={checkConnection}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 mr-2">
              <SophisticatedLoader size="sm" />
            </div>
          ) : (
            <Calendar className="h-4 w-4 mr-2" />
          )}
          Connect Calendar
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Calendar Integration</h3>
          <Badge variant="outline" className="text-green-600 border-green-600">
            Connected
          </Badge>
        </div>
        <Button 
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Schedule Meeting Form */}
      {showScheduleForm && (
        <Card className="p-4 border-primary/20 bg-card text-card-foreground">
          <h4 className="font-medium mb-4">Schedule Meeting</h4>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background placeholder:text-muted-foreground"
                placeholder="Meeting title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background placeholder:text-muted-foreground"
                rows={3}
                placeholder="Meeting description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Attendees (comma-separated emails)</label>
              <input
                type="text"
                value={scheduleForm.attendees}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, attendees: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background placeholder:text-muted-foreground"
                placeholder="user1@company.com, user2@company.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Location (optional)</label>
              <input
                type="text"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background placeholder:text-muted-foreground"
                placeholder="Conference Room A"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleScheduleMeeting}
                disabled={isLoading || !scheduleForm.startTime || !scheduleForm.endTime}
              >
                {isLoading ? (
                  <div className="h-4 w-4 mr-2">
                    <SophisticatedLoader size="sm" />
                  </div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Schedule Meeting
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowScheduleForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upcoming Events */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Upcoming Events</h4>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadUpcomingEvents}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4">
                <SophisticatedLoader size="sm" />
              </div>
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <SophisticatedLoader size="md" />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium truncate">{event.title}</h5>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(event.startTime)}</span>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <Badge 
                  variant={event.status === 'confirmed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming events</p>
            <p className="text-sm">Schedule a meeting to get started</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}
