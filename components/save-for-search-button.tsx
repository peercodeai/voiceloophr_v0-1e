"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"

interface SaveForSearchButtonProps {
  documentId: string
  fileName: string
  text: string
  userId?: string
  isSearchable?: boolean
  searchChunks?: number
  onSaved?: () => void
}

export default function SaveForSearchButton({
  documentId,
  fileName,
  text,
  userId,
  isSearchable = false,
  searchChunks = 0,
  onSaved
}: SaveForSearchButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)

  // Check if OpenAI key is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const openaiKey = localStorage.getItem('voiceloop_openai_key')
      setHasOpenAIKey(!!openaiKey)
    }
  }, [])

  const handleSaveForSearch = async () => {
    if (!hasOpenAIKey) {
      toast.error("OpenAI API key required", {
        description: "Please configure your OpenAI API key in Settings to enable semantic search."
      })
      return
    }

    setIsSaving(true)
    
    try {
      const openaiKey = localStorage.getItem('voiceloop_openai_key')
      
      const response = await fetch('/api/rag/save-for-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          fileName,
          text,
          userId,
          openaiKey
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success("Document saved for semantic search!", {
          description: `Created ${result.chunks?.length || 0} searchable chunks.`
        })
        
        if (onSaved) {
          onSaved()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save for search')
      }
    } catch (error) {
      console.error('Save for search error:', error)
      toast.error("Failed to save for search", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isSearchable) {
    return (
      <Card className="p-4 border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <h4 className="font-medium text-green-800 dark:text-green-200">
              Ready for Semantic Search
            </h4>
            <p className="text-sm text-green-600 dark:text-green-300">
              This document is searchable with {searchChunks} chunks
            </p>
          </div>
          <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
            Searchable
          </Badge>
        </div>
      </Card>
    )
  }

  if (!hasOpenAIKey) {
    return (
      <Card className="p-4 border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              OpenAI API Key Required
            </h4>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Configure your OpenAI API key in Settings to enable semantic search
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-center gap-3">
        <Search className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-800 dark:text-blue-200">
            Enable Semantic Search
          </h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Save this document to make it searchable across all your content
          </p>
        </div>
        <Button
          onClick={handleSaveForSearch}
          disabled={isSaving}
          size="sm"
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Save for Search
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
