"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SaveToDatabaseButtonProps {
  documentId: string
  fileName: string
  text: string
  userId?: string
  isSaved?: boolean
  onSaved?: () => void
}

export default function SaveToDatabaseButton({
  documentId,
  fileName,
  text,
  userId,
  isSaved = false,
  onSaved
}: SaveToDatabaseButtonProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(isSaved)
  const [error, setError] = useState<string | null>(null)

  // Check if document is already saved in localStorage
  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
      const fileData = existing[documentId]
      if (fileData && fileData.savedToDatabase) {
        setSaved(true)
      }
    } catch (error) {
      console.warn('Failed to check save status:', error)
    }
  }, [documentId])

  const handleSaveToDatabase = async () => {
    if (saving || saved) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/documents/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          fileName,
          text,
          userId,
          fileType: 'application/pdf', // Default type
          fileSize: text.length,
          processingMethod: 'upload'
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update localStorage to mark as saved
        try {
          const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
          if (existing[documentId]) {
            existing[documentId] = {
              ...existing[documentId],
              savedToDatabase: true,
              databaseId: result.documentId
            }
            localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          }
        } catch (localError) {
          console.warn('Failed to update localStorage:', localError)
        }

        setSaved(true)
        toast.success("Document saved to database successfully!")
        
        if (onSaved) {
          onSaved()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to save document'
        setError(errorMessage)
        toast.error(`Failed to save document: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error saving to database:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error(`Failed to save document: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <Card className="p-4 border-2 border-green-200 bg-green-50">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Document Saved to Database
            </p>
            <p className="text-xs text-green-700">
              This document has been saved as a hard copy in the database for future reference.
            </p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Saved
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50">
      <div className="flex items-center gap-3">
        <Database className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            Save Document to Database
          </p>
          <p className="text-xs text-blue-700">
            Store this document as a hard copy in the database for future reference and management.
          </p>
          {error && (
            <p className="text-xs text-red-600 mt-1">
              Error: {error}
            </p>
          )}
        </div>
        <Button
          onClick={handleSaveToDatabase}
          disabled={saving}
          size="sm"
          className="font-light bg-gray-600 hover:bg-gray-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Save to Database
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
