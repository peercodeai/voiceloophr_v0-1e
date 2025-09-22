"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, Database, HardDrive } from "lucide-react"

export default function GuestModeIndicator() {
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestStats, setGuestStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    avgChunkSize: 0
  })

  useEffect(() => {
    // Check if we're in guest mode (no Supabase)
    const checkGuestMode = () => {
      try {
        // Check if we have any guest chunks in localStorage
        const guestChunks = JSON.parse(localStorage.getItem('voiceloop_guest_chunks') || '[]')
        
        if (guestChunks.length > 0) {
          setIsGuestMode(true)
          
          // Calculate basic stats
          const uniqueDocuments = new Set(guestChunks.map((chunk: any) => 
            chunk.documentId || chunk.document_id
          )).size
          
          const avgChunkSize = guestChunks.reduce((sum: number, chunk: any) => {
            const text = chunk.chunkText || chunk.chunk_text || ''
            return sum + text.length
          }, 0) / guestChunks.length

          setGuestStats({
            totalDocuments: uniqueDocuments,
            totalChunks: guestChunks.length,
            avgChunkSize: Math.round(avgChunkSize)
          })
        }
      } catch (error) {
        console.warn('Error checking guest mode:', error)
      }
    }

    checkGuestMode()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      checkGuestMode()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (!isGuestMode) {
    return null
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-center gap-3">
        <HardDrive className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Guest Mode Active
            </h4>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
              Local Storage
            </Badge>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Documents are stored locally in your browser. Data will persist between sessions but is not synced to the cloud.
          </p>
          <div className="flex gap-4 mt-2 text-xs text-blue-600 dark:text-blue-300">
            <span>📄 {guestStats.totalDocuments} documents</span>
            <span>🧩 {guestStats.totalChunks} chunks</span>
            <span>📏 {guestStats.avgChunkSize} avg chars</span>
          </div>
        </div>
        <Info className="h-4 w-4 text-blue-500" />
      </div>
    </Card>
  )
}
