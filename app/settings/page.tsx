"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, Eye, EyeOff, LogIn, LogOut, Calendar, Cloud, CheckCircle, XCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
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

  const handleOAuth = async (provider: 'google' | 'linkedin_oidc' | 'azure') => {
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const redirectTo = typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback` : undefined
      const scopes = provider === 'google'
        ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
        : provider === 'linkedin_oidc'
        ? 'openid profile email'
        : 'openid email profile offline_access https://graph.microsoft.com/calendars.read'
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes,
          queryParams: provider === 'azure' 
            ? { prompt: 'consent' }
            : { prompt: 'consent select_account', access_type: 'offline' }
        }
      })
    } catch (e) {
      console.error('Auth error:', e)
    }
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

  const handleServiceSignOut = (service: string) => {
    switch (service) {
      case 'google':
        localStorage.removeItem('google_drive_tokens')
        break
      case 'microsoft':
        localStorage.removeItem('microsoft_calendar_tokens')
        break
      case 'calendar':
        localStorage.removeItem('google_calendar_tokens')
        break
    }
    setServiceStatus(prev => ({ ...prev, [service]: false }))
  }

  const handleGoogleCalendarAuth = async () => {
    try {
      const response = await fetch('/api/calendar/auth/google', { method: 'POST' })
      const data = await response.json()
      if (data?.authUrl) {
        window.open(data.authUrl, 'google-calendar-auth', 'width=500,height=650')
        setTimeout(() => {
          const tokens = localStorage.getItem('google_calendar_tokens')
          if (tokens) {
            setServiceStatus(prev => ({ ...prev, calendar: true }))
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Google Calendar auth error:', error)
    }
  }

  const handleMicrosoftAuth = async () => {
    try {
      const response = await fetch('/api/calendar/auth/microsoft', { method: 'POST' })
      const data = await response.json()
      if (data?.authUrl) {
        const popup = window.open(data.authUrl, 'microsoft-auth', 'width=500,height=650')
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer)
            const tokens = localStorage.getItem('microsoft_calendar_tokens')
            if (tokens) {
              setServiceStatus(prev => ({ ...prev, microsoft: true }))
            }
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Microsoft auth error:', error)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />

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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Sign in to sync your documents and settings
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOAuth('google')}
                        className="text-blue-600 border-blue-200 hover:border-blue-300"
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Google
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOAuth('linkedin_oidc')}
                        className="text-blue-600 border-blue-200 hover:border-blue-300"
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        LinkedIn
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOAuth('azure')}
                        className="text-blue-600 border-blue-200 hover:border-blue-300"
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Microsoft
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Google Drive */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="font-medium">Google Drive</h3>
                      <p className="text-sm text-muted-foreground">Access and import documents from Google Drive</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {serviceStatus.google ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleServiceSignOut('google')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOAuth('google')}
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {/* Google Calendar */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <div>
                      <h3 className="font-medium">Google Calendar</h3>
                      <p className="text-sm text-muted-foreground">Schedule meetings and view calendar events</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {serviceStatus.calendar ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleServiceSignOut('calendar')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGoogleCalendarAuth}
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {/* Microsoft Calendar */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium">Microsoft Calendar</h3>
                      <p className="text-sm text-muted-foreground">Access Outlook calendar and schedule meetings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {serviceStatus.microsoft ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleServiceSignOut('microsoft')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleMicrosoftAuth}
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    )}
                  </div>
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

              {/* ElevenLabs API Key */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-montserrat-light mb-2">ElevenLabs API Key</h3>
                  <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                    Required for high-quality text-to-speech and voice responses
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="elevenlabs-key" className="text-sm font-montserrat-light">
                    API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="elevenlabs-key"
                      type={showElevenlabsKey ? "text" : "password"}
                      placeholder="sk_..."
                      value={elevenlabsKey}
                      onChange={(e) => setElevenlabsKey(e.target.value)}
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowElevenlabsKey(!showElevenlabsKey)}
                    >
                      {showElevenlabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {elevenlabsKey && !showElevenlabsKey && (
                    <p className="text-xs text-muted-foreground font-mono">Current: {maskKey(elevenlabsKey)}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* TTS Settings */}
            <Card className="p-6 border-thin">
              <h3 className="text-lg font-light mb-2">Text-to-Speech</h3>
              <p className="text-sm text-muted-foreground mb-4">Choose provider and voice for spoken responses.</p>
              <div className="space-y-3">
                <Label className="text-sm font-light">Provider</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="auto" checked={ttsProvider === 'auto'} onChange={() => setTtsProvider('auto')} />
                    Auto (prefer ElevenLabs, fallback to OpenAI)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="elevenlabs" checked={ttsProvider === 'elevenlabs'} onChange={() => setTtsProvider('elevenlabs')} />
                    ElevenLabs
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="openai" checked={ttsProvider === 'openai'} onChange={() => setTtsProvider('openai')} />
                    OpenAI
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-light">ElevenLabs Voice</Label>
                  <div className="flex gap-2 items-center">
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                      value={elevenlabsVoice}
                      onChange={(e) => setElevenlabsVoice(e.target.value)}
                      onFocus={async (e) => {
                        // Lazy-load voice list when user opens the dropdown
                        try {
                          const el = e.currentTarget as HTMLSelectElement
                          if (el.options.length > 1) return
                          const key = localStorage.getItem('voiceloop_elevenlabs_key')
                          if (!key) { alert('Add ElevenLabs key first'); return }
                          const resp = await fetch('/api/tts/voices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elevenlabsKey: key }) })
                          const data = await resp.json()
                          if (!resp.ok || !data?.voices) { alert(data?.error || 'Failed to fetch voices'); return }
                          // Clear old options except current value placeholder
                          while (el.options.length) el.remove(0)
                          el.add(new Option('Select a voice...', ''))
                          for (const v of data.voices as Array<{ id: string; name: string }>) {
                            el.add(new Option(`${v.name} — ${v.id}`, v.id))
                          }
                        } catch (err) {
                          alert('Failed to load voices')
                        }
                      }}
                    >
                      <option value="">Select a voice...</option>
                      {elevenlabsVoice && <option value={elevenlabsVoice}>{elevenlabsVoice}</option>}
                    </select>
                    <Input
                      placeholder="or type name/ID"
                      value={elevenlabsVoice}
                      onChange={(e) => setElevenlabsVoice(e.target.value)}
                      className="font-mono text-sm max-w-[220px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Dropdown lists your 11labs voices; you can also paste a custom ID.</p>
                </div>
              </div>
            </Card>

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
                <p>• Keys are used only for direct API calls to OpenAI and ElevenLabs</p>
                <p>• You can clear your keys anytime by clearing browser data</p>
                <p>
                  • Get your OpenAI key at: <span className="font-mono">platform.openai.com</span>
                </p>
                <p>
                  • Get your ElevenLabs key at: <span className="font-mono">elevenlabs.io</span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Footer */}
      <Footer />
    </div>
  )
}
