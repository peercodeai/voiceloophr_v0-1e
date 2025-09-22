"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus } from "lucide-react"
import { useState } from "react"

export default function PlaceholderCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Generate calendar days
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  const days = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(
      <div key={day} className="h-8 flex items-center justify-center text-sm text-muted-foreground">
        {day}
      </div>
    )
  }
  
  const handleSignIn = () => {
    // This will be handled by the parent component or auth modal
    window.dispatchEvent(new CustomEvent('showAuthModal'))
  }

  return (
    <Card className="p-6 border-thin">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-light text-foreground">Calendar</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="font-montserrat-light bg-transparent"
          onClick={handleSignIn}
        >
          <Plus className="h-4 w-4 mr-2" />
          Connect Calendar
        </Button>
      </div>
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(year, month - 1))}
          className="font-montserrat-light text-muted-foreground hover:text-foreground"
        >
          ←
        </Button>
        <h4 className="text-lg font-light text-foreground">
          {monthNames[month]} {year}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(new Date(year, month + 1))}
          className="font-montserrat-light text-muted-foreground hover:text-foreground"
        >
          →
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-light text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
      
      {/* Sign in prompt */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg text-center">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-light mb-3">
          Sign in to view and manage your calendar events
        </p>
        <Button 
          onClick={handleSignIn}
          className="font-montserrat-light"
        >
          Sign In to Access Calendar
        </Button>
      </div>
    </Card>
  )
}


