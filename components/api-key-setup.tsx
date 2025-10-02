// API Key Setup Component
// This component helps users configure their OpenAI API key

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface ApiKeySetupProps {
  onApiKeySet?: (apiKey: string) => void
  showTitle?: boolean
}

export default function ApiKeySetup({ onApiKeySet, showTitle = true }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const validateApiKey = async (key: string) => {
    if (!key.trim()) return false

    setIsValidating(true)
    setValidationStatus('idle')
    setErrorMessage('')

    try {
      // Test the API key with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      })

      if (response.ok) {
        setValidationStatus('valid')
        return true
      } else if (response.status === 401) {
        setValidationStatus('invalid')
        setErrorMessage('Invalid API key. Please check your key and try again.')
        return false
      } else {
        setValidationStatus('error')
        setErrorMessage('Unable to validate API key. Please check your internet connection.')
        return false
      }
    } catch (error) {
      setValidationStatus('error')
      setErrorMessage('Network error. Please check your internet connection and try again.')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return

    const isValid = await validateApiKey(apiKey)
    if (isValid) {
      // Save to localStorage
      localStorage.setItem('voiceloop_openai_key', apiKey)
      
      // Notify parent component
      onApiKeySet?.(apiKey)
      
      // Show success message
      setValidationStatus('valid')
    }
  }

  const handleKeyChange = (value: string) => {
    setApiKey(value)
    setValidationStatus('idle')
    setErrorMessage('')
  }

  const loadExistingKey = () => {
    const existingKey = localStorage.getItem('voiceloop_openai_key')
    if (existingKey) {
      setApiKey(existingKey)
      setValidationStatus('valid')
    }
  }

  // Load existing key on mount
  useState(() => {
    loadExistingKey()
  })

  return (
    <Card className="w-full max-w-md">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            API Key Required
          </CardTitle>
          <CardDescription>
            Configure your OpenAI API key to enable chat functionality
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="api-key" className="text-sm font-medium">
            OpenAI API Key
          </label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              className={`pr-10 ${
                validationStatus === 'valid' ? 'border-green-500' : 
                validationStatus === 'invalid' ? 'border-red-500' : ''
              }`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {validationStatus === 'valid' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              API key is valid and ready to use!
            </AlertDescription>
          </Alert>
        )}

        {validationStatus === 'invalid' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {validationStatus === 'error' && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!apiKey.trim() || isValidating}
            className="flex-1"
          >
            {isValidating ? 'Validating...' : 'Save API Key'}
          </Button>
          
          <Button
            variant="outline"
            onClick={loadExistingKey}
            disabled={isValidating}
          >
            Load Saved
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></p>
          <p>• Your key is stored locally and never shared</p>
          <p>• Required for chat, analysis, and voice features</p>
        </div>
      </CardContent>
    </Card>
  )
}
