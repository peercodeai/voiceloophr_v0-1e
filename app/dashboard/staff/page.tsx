"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Users, 
  Search, 
  Plus, 
  Filter,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react'
import { MobileNavigation } from '@/components/mobile-navigation'

interface Employee {
  id: number
  name: string
  email: string
  phone_number?: string
  job_title?: string
  department?: string
  hire_date?: string
  salary?: number
  address?: string
  skills?: string[]
}

interface CalendarEvent {
  id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  event_type?: string
  status?: string
  employee?: Employee
  interviewer?: Employee
}

export default function StaffDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [activeTab, setActiveTab] = useState('employees')

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (departmentFilter) params.set('department', departmentFilter)
      
      const response = await fetch(`/api/employees?${params}`)
      const data = await response.json()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch('/api/calendar')
      const data = await response.json()
      setCalendarEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchEmployees(), fetchCalendarEvents()])
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [searchTerm, departmentFilter])

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getEventStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Staff Dashboard</h1>
          <p className="text-muted-foreground">Manage employees and interview scheduling</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="pl-10 pr-10 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading employees...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {employees.map((employee) => (
                  <Card key={employee.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{employee.name}</h3>
                        <p className="text-muted-foreground">{employee.job_title}</p>
                      </div>
                      <Badge variant="outline">{employee.department}</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {employee.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                      )}
                      {employee.phone_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {employee.phone_number}
                        </div>
                      )}
                      {employee.hire_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          Hired: {formatDate(employee.hire_date)}
                        </div>
                      )}
                      {employee.salary && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          ${employee.salary.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {employee.skills && employee.skills.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {employee.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{employee.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Interview Schedule</h2>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule Interview
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading calendar events...</div>
            ) : (
              <div className="space-y-4">
                {calendarEvents.map((event) => (
                  <Card key={event.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-muted-foreground">
                          {formatDate(event.start_time)} at {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </p>
                      </div>
                      <Badge className={getEventStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {event.employee && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Candidate: {event.employee.name}
                        </div>
                      )}
                      {event.interviewer && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          Interviewer: {event.interviewer.name}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-muted-foreground mt-2">{event.description}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
