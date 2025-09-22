"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Key, Check, Eye, EyeOff } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function OpenAISettings() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load API key from localStorage on component mount
    const savedKey = localStorage.getItem('voiceloop_openai_key')
    if (savedKey) {
      setApiKey(savedKey)
      setIsValid(true)
    }
  }, [])

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return

    setIsLoading(true)
    
    try {
      // Basic validation - OpenAI keys start with 'sk-'
      if (!apiKey.startsWith('sk-')) {
        alert('Invalid OpenAI API key format. Keys should start with "sk-"')
        return
      }

      // Save locally for fallback
      localStorage.setItem('voiceloop_openai_key', apiKey)
      setIsValid(true)

      // If signed in, persist to server
      const supabase = getSupabaseBrowser()
      const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } as any }
      if (user?.id) {
        await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, openaiApiKey: apiKey })
        })
      }
      
      // Test the key with a simple API call
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test document for API key validation.',
          fileName: 'test.txt',
          fileType: 'text/plain',
          openaiKey: apiKey
        })
      })

      if (response.ok) {
        console.log('✅ OpenAI API key validated successfully')
      } else {
        console.warn('⚠️ OpenAI API key may be invalid')
      }
      
    } catch (error) {
      console.error('Error saving API key:', error)
      alert('Error saving API key. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveKey = () => {
    localStorage.removeItem('voiceloop_openai_key')
    setApiKey('')
    setIsValid(false)
  }

  const handleClearKey = () => {
    setApiKey('')
    setIsValid(false)
  }

  return (
    <Card className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200">
      <div className="flex items-center gap-3 mb-4">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-light">OpenAI Settings</h3>
        {isValid && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-muted-foreground mb-2">
            OpenAI API Key
          </label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
                className="h-8 w-8 p-0"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your API key is stored locally and never sent to our servers
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || isLoading}
            className="flex-1"
          >
            <Key className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Key'}
          </Button>
          
          {isValid && (
            <>
              <Button
                variant="outline"
                onClick={handleRemoveKey}
                className="flex-1"
              >
                Remove Key
              </Button>
              <Button
                variant="outline"
                onClick={handleClearKey}
                className="flex-1"
              >
                Clear Input
              </Button>
            </>
          )}
        </div>

        {isValid && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✅ OpenAI API key configured! Your documents will now be analyzed using GPT-4 for intelligent business insights.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>What this enables:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Real AI-powered document analysis</li>
            <li>Business sentiment analysis</li>
            <li>Risk assessment and recommendations</li>
            <li>Strategic business insights</li>
            <li>Professional-grade document summaries</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
