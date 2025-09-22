"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  User
} from "lucide-react"

interface GoogleAccountSelectorProps {
  onProviderConnected: (provider: any) => void
}

export function GoogleAccountSelector({ onProviderConnected }: GoogleAccountSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // First, clear any existing Google session to force account selection
      // This ensures the user can choose the correct account (williamtflynn)
      const clearSessionUrl = 'https://accounts.google.com/logout'
      
      // Open a hidden iframe to clear the session
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = clearSessionUrl
      document.body.appendChild(iframe)
      
      // Wait a moment for the session to clear
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Remove the iframe
      document.body.removeChild(iframe)

      // Now get the OAuth URL
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success && data.authUrl) {
        // Open OAuth popup with account selection
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        // Listen for auth completion
        const checkClosed = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            
            // Check if we have tokens in localStorage (set by OAuth callback)
            const tokens = localStorage.getItem('google_calendar_tokens')
            if (tokens) {
              setSuccess('Google Calendar connected successfully!')
              onProviderConnected({
                id: 'google',
                name: 'Google Calendar',
                type: 'google',
                status: 'connected'
              })
            } else {
              setError('Authentication was cancelled or failed')
            }
          }
        }, 1000)
      } else {
        setError(data.error || 'Failed to start Google authentication')
      }
    } catch (error) {
      console.error('Google auth failed:', error)
      setError('Failed to connect to Google Calendar. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDirectAuth = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Direct OAuth flow without clearing session
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success && data.authUrl) {
        // Open OAuth popup
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        // Listen for auth completion
        const checkClosed = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            
            // Check if we have tokens in localStorage (set by OAuth callback)
            const tokens = localStorage.getItem('google_calendar_tokens')
            if (tokens) {
              setSuccess('Google Calendar connected successfully!')
              onProviderConnected({
                id: 'google',
                name: 'Google Calendar',
                type: 'google',
                status: 'connected'
              })
            } else {
              setError('Authentication was cancelled or failed')
            }
          }
        }, 1000)
      } else {
        setError(data.error || 'Failed to start Google authentication')
      }
    } catch (error) {
      console.error('Google auth failed:', error)
      setError('Failed to connect to Google Calendar. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Connect Google Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to connect to Google Calendar
        </p>
      </div>

      {/* Account Selection Options */}
      <div className="grid gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Select Account (Recommended)</h3>
                <p className="text-sm text-muted-foreground">
                  Clear existing session and choose the correct Google account
                </p>
              </div>
            </div>
            <Button 
              onClick={handleGoogleAuth}
              disabled={isLoading}
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Select Account
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium">Use Current Account</h3>
                <p className="text-sm text-muted-foreground">
                  Connect using the currently signed-in Google account
                </p>
              </div>
            </div>
            <Button 
              onClick={handleDirectAuth}
              disabled={isLoading}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Directly
            </Button>
          </div>
        </Card>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Success</span>
          </div>
          <p className="text-sm text-green-700 mt-1">{success}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Connecting...</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Please complete the authentication in the popup window
          </p>
        </Card>
      )}

      {/* Help Text */}
      <Card className="p-4 bg-muted">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Account Selection Help:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Select Account:</strong> Use this if you want to choose a specific Google account</li>
              <li><strong>Use Current Account:</strong> Use this if you're already signed in to the correct account</li>
              <li>If you see "sentilabs06@gmail.com", use "Select Account" to choose "williamtflynn"</li>
              <li>Make sure you're signed in to the account you want to use for calendar access</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
