"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, Eye, EyeOff, LogIn, LogOut, Calendar, Cloud, CheckCircle, XCircle, Volume2 } from "lucide-react"
import { MobileNavigation } from "@/components/mobile-navigation"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { AuthModal } from '@/components/auth-modal'

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("")
  const [elevenlabsKey, setElevenlabsKey] = useState("")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false)
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'openai' | 'auto'>("auto")
  const [elevenlabsVoice, setElevenlabsVoice] = useState<string>("")
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [serviceStatus, setServiceStatus] = useState({
    google: false,
    microsoft: false,
    calendar: false
  })

  useEffect(() => {
    // Load saved keys from localStorage
    const savedOpenaiKey = localStorage.getItem("voiceloop_openai_key") || ""
    const savedElevenlabsKey = localStorage.getItem("voiceloop_elevenlabs_key") || ""
    const savedProvider = (localStorage.getItem("voiceloop_tts_provider") as any) || 'auto'
    const savedVoice = localStorage.getItem("voiceloop_elevenlabs_voice") || ""
    setOpenaiKey(savedOpenaiKey)
    setElevenlabsKey(savedElevenlabsKey)
    setTtsProvider(savedProvider === 'elevenlabs' || savedProvider === 'openai' ? savedProvider : 'auto')
    setElevenlabsVoice(savedVoice)

    // Load user authentication status
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch {}
    }
    
    // Load service connection status
    const loadServiceStatus = () => {
      const googleConnected = !!localStorage.getItem('google_drive_tokens')
      const microsoftConnected = !!localStorage.getItem('microsoft_calendar_tokens')
      const calendarConnected = !!localStorage.getItem('google_calendar_tokens')
      
      setServiceStatus({
        google: googleConnected,
        microsoft: microsoftConnected,
        calendar: calendarConnected
      })
    }
    
    loadUser()
    loadServiceStatus()
  }, [])

  const handleSave = () => {
    localStorage.setItem("voiceloop_openai_key", openaiKey)
    localStorage.setItem("voiceloop_elevenlabs_key", elevenlabsKey)
    localStorage.setItem("voiceloop_tts_provider", ttsProvider)
    localStorage.setItem("voiceloop_elevenlabs_voice", elevenlabsVoice)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (key: string) => {
    if (!key) return ""
    return key.slice(0, 8) + "..." + key.slice(-4)
  }



  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowser()
      await supabase?.auth.signOut()
      setUserId(null)
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }




  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MobileNavigation />

      {/* Settings Content */}
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-montserrat-light text-foreground mb-2">Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-montserrat-light">
              Configure your account and API keys to enable AI processing and voice features
            </p>
          </div>

          <div className="space-y-6">
            {/* Account & Service Connections Section */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Cloud className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-montserrat-light">Account & Service Connections</h2>
              </div>
              <p className="text-sm text-muted-foreground font-montserrat-light mb-6">
                Sign in to sync your documents and settings across devices. Connect to external services for enhanced functionality.
              </p>

              {/* Main Account Status */}
              {userId ? (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Signed in - Your documents and settings are synced
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-1 h-3 w-3" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Sign in with email and password to access all features
                      </span>
                    </div>
                    <div className="w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAuthOpen(true)}
                        className="text-blue-600 border-blue-200 hover:border-blue-300 w-full sm:w-auto"
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Sign In
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-center py-8">
                  <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">External Integrations Removed</h3>
                  <p className="text-sm text-muted-foreground">
                    The simplified version focuses on core HR functionality. External platform integrations have been removed for a streamlined experience.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can still upload documents directly and manage employees through the Staff Dashboard.
                  </p>
                </div>
              </div>
            </Card>

            {/* API Settings Section */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-montserrat-light">API Settings</h2>
              </div>
              <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                Configure your API keys to enable AI processing and voice features
              </p>

              {/* OpenAI API Key */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-montserrat-light mb-2">OpenAI API Key</h3>
                  <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                    Required for document summarization (GPT-4) and audio transcription (Whisper)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="openai-key" className="text-sm font-montserrat-light">
                    API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="openai-key"
                      type={showOpenaiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    >
                      {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {openaiKey && !showOpenaiKey && (
                    <p className="text-xs text-muted-foreground font-mono">Current: {maskKey(openaiKey)}</p>
                  )}
                </div>
              </div>

            </Card>

            {/* TTS Settings */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Volume2 className="h-5 w-5 text-accent" />
                <h3 className="text-xl font-montserrat-light">Text-to-Speech Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                Voice responses use OpenAI TTS with your existing API key. No additional configuration needed.
              </p>
              
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="flex flex-wrap gap-2">
                  {(openaiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      OpenAI TTS Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      <XCircle className="h-3 w-3" />
                      OpenAI API key required for voice features
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Test API Connection Buttons */}
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/health', {
                      method: 'GET'
                    })
                    
                    if (response.ok) {
                      const data = await response.json()
                      alert(`✅ Server health check passed!\n\nEnvironment:\n• OpenAI Key: ${data.environment?.hasOpenAIKey ? '✅ Set' : '❌ Missing'}\n• Supabase: ${data.environment?.hasSupabaseUrl ? '✅ Set' : '❌ Missing'}\n• Node Env: ${data.environment?.nodeEnv}`)
                    } else {
                      alert(`❌ Health check failed: Status ${response.status}`)
                    }
                  } catch (error) {
                    alert(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                  }
                }}
                variant="outline"
                className="font-light"
              >
                Test Server Health
              </Button>

              {openaiKey && (
                <>
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/test-openai', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ apiKey: openaiKey })
                        })
                        
                        if (response.ok) {
                          const result = await response.json()
                          alert(`✅ Simple test successful!\n\nResponse: ${result.response}`)
                        } else {
                          const error = await response.json()
                          alert(`❌ Simple test failed: ${error.error || 'Unknown error'} (Status: ${response.status})`)
                        }
                      } catch (error) {
                        alert(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }}
                    variant="outline"
                    className="font-light"
                  >
                    Test Simple OpenAI
                  </Button>

                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/analyze', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: 'Test document for API key validation.',
                            fileName: 'test.txt',
                            fileType: 'text/plain',
                            openaiKey: openaiKey
                          })
                        })
                        
                        if (response.ok) {
                          alert('✅ Full analysis test successful! OpenAI connection working.')
                        } else {
                          const error = await response.json()
                          alert(`❌ Analysis test failed: ${error.message || 'Unknown error'} (Status: ${response.status})\n\nDebug info: ${JSON.stringify(error.debug || {})}`)
                        }
                      } catch (error) {
                        alert(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }}
                    variant="outline"
                    className="font-light"
                  >
                    Test Full Analysis
                  </Button>
                </>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} className="font-light px-8" disabled={!openaiKey && !elevenlabsKey}>
                <Save className="mr-2 h-4 w-4" />
                {saved ? "Saved!" : "Save Settings"}
              </Button>
            </div>

            {/* Info Card */}
            <Card className="p-6 border-thin bg-muted/30">
              <h3 className="text-lg font-light mb-3">Security Notice</h3>
              <div className="space-y-2 text-sm text-muted-foreground font-light">
                <p>• API keys are stored locally in your browser and never sent to our servers</p>
                <p>• Keys are used only for direct API calls to OpenAI</p>
                <p>• You can clear your keys anytime by clearing browser data</p>
                <p>
                  • Get your OpenAI key at: <span className="font-mono">platform.openai.com</span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
