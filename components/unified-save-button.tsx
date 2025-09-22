"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  Database, 
  Search, 
  Check, 
  X, 
  Loader2,
  AlertCircle
} from "lucide-react"

interface UnifiedSaveButtonProps {
  documentId: string
  documentName: string
  extractedText: string
  userId?: string
  onSaveComplete?: () => void
}

export function UnifiedSaveButton({ 
  documentId, 
  documentName, 
  extractedText, 
  userId,
  onSaveComplete 
}: UnifiedSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleUnifiedSave = async () => {
    if (!extractedText) {
      setErrorMessage('No text content available to save')
      setSaveStatus('error')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')
    setErrorMessage('')

    try {
      // Save to database (hard copy)
      const databaseResponse = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: documentId,
          name: documentName,
          type: 'text/plain', // Default type for extracted text
          size: extractedText.length,
          extractedText: extractedText,
          summary: '', // Will be generated if needed
          processingMethod: 'unified-save',
          userId: userId
        })
      })

      const databaseResult = await databaseResponse.json()

      // Save to RAG (semantic search)
      const ragResponse = await fetch('/api/rag/save-for-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: documentId,
          fileName: documentName,
          text: extractedText,
          userId: userId
        })
      })

      const ragResult = await ragResponse.json()

      // Check both results
      const databaseSuccess = databaseResponse.ok && databaseResult.success
      const ragSuccess = ragResponse.ok && ragResult.success

      if (databaseSuccess && ragSuccess) {
        setSaveStatus('success')
        onSaveComplete?.()
      } else {
        const errors = []
        if (!databaseSuccess) errors.push('Database save failed')
        if (!ragSuccess) errors.push('Semantic search save failed')
        setErrorMessage(errors.join(', '))
        setSaveStatus('error')
      }

    } catch (error) {
      console.error('Unified save error:', error)
      setErrorMessage('Failed to save document')
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Save className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'success':
        return 'Saved Successfully'
      case 'error':
        return 'Save Failed'
      default:
        return 'Save Document'
    }
  }

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <Card className="p-6 border-2 border-dashed border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Save Document
            </h3>
            <p className="text-sm text-muted-foreground">
              Store as hard copy and enable semantic search
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
          
          <Button
            onClick={handleUnifiedSave}
            disabled={isSaving || saveStatus === 'success'}
            className={`font-montserrat-light ${
              saveStatus === 'success' 
                ? 'bg-green-600 hover:bg-green-700' 
                : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {getStatusIcon()}
            <span className="ml-2">{getStatusText()}</span>
          </Button>
        </div>
      </div>
      
      {saveStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">
              Document saved successfully!
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Your document has been stored as a hard copy and is now searchable across all your content.
          </p>
        </div>
      )}
    </Card>
  )
}
