"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GoogleAccountSelector } from "@/components/google-account-selector"
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw
} from "lucide-react"

export default function TestOAuthPage() {
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleProviderConnected = (provider: any) => {
    setConnectedProviders(prev => [...prev, provider])
    setTestResult(`✅ Connected to ${provider.name} successfully!`)
  }

  const testGoogleOAuth = async () => {
    try {
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (data.success) {
        setTestResult(`✅ Google OAuth URL generated: ${data.authUrl}`)
      } else {
        setTestResult(`❌ Google OAuth failed: ${data.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Google OAuth error: ${error}`)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">OAuth Test Page</h1>
        <p className="text-muted-foreground">
          Test the fixed OAuth flows for Google Calendar
        </p>
      </div>

      {/* Test Results */}
      {testResult && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2">
            {testResult.includes('✅') ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">Test Result</span>
          </div>
          <p className="text-sm mt-1">{testResult}</p>
        </Card>
      )}

      {/* Connected Providers */}
      {connectedProviders.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-2">Connected Providers</h3>
          <div className="flex gap-2">
            {connectedProviders.map((provider) => (
              <div key={provider.id} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <CheckCircle className="h-3 w-3" />
                {provider.name}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Tests */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Quick OAuth Tests</h3>
        <div className="flex gap-4">
          <Button onClick={testGoogleOAuth} variant="outline">
            Test Google OAuth URL
          </Button>
        </div>
      </Card>

      {/* Google Account Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Google Account Selector</h3>
        <GoogleAccountSelector onProviderConnected={handleProviderConnected} />
      </Card>

      {/* Help Text */}
      <Card className="p-4 mt-6 bg-muted">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Testing Instructions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click "Test Google OAuth URL" to verify the OAuth URL is generated correctly</li>
              <li>Use "Select Account" to force account selection and choose williamtflynn</li>
              <li>Use "Connect Directly" to use the currently signed-in account</li>
              <li>Check the test results above for any errors</li>
              <li>If you see "sentilabs06@gmail.com", use "Select Account" to choose the correct account</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
