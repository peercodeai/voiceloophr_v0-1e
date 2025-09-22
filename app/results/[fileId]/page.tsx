"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Mic, Copy, Check, AlertCircle } from "lucide-react"
import { LocalStorageManager } from "@/lib/utils/storage"
import OpenAISettings from "@/components/OpenAISettings"
import UnifiedVoiceChat from "@/components/voice-chat"
import { DocumentViewer } from "@/components/DocumentViewer"
import { UnifiedSaveButton } from "@/components/unified-save-button"
import { Navigation } from "@/components/navigation"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import GoogleDriveFolderPicker from '@/components/google-drive-folder-picker'
import PostGenerator from '@/components/post-generator'

interface ProcessedFile {
  id: string
  name: string
  type: string
  size: number
  extractedText: string
  summary: string
  transcription?: string
  processedAt: string
  processingMethod?: string
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string
  const [userId, setUserId] = useState<string | null>(null)
  const [fileData, setFileData] = useState<ProcessedFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isBrowser, setIsBrowser] = useState(false)
  // Inline chat (unified component); no modal state needed
  const [error, setError] = useState<string | null>(null)
  const [isSavingToDrive, setIsSavingToDrive] = useState(false)
  const [saveToDriveMsg, setSaveToDriveMsg] = useState<string | null>(null)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<{ id: string, name: string } | null>(null)

  // Ensure we're in the browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined' && typeof document !== 'undefined')
  }, [])

  // Load user authentication state and listen for changes
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch (error) {
        console.error('Error loading user:', error)
        setUserId(null)
      }
    }
    loadUser()

    // Listen for auth state changes
    const supabase = getSupabaseBrowser()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUserId(null)
          // Redirect to home page when user signs out
          router.push('/')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUserId(session.user.id)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (!isBrowser) return
        
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Get file data from storage
        let fileData = null
        
        // Try global storage first
        const globalFiles = (global as any).uploadedFiles || new Map()
        fileData = globalFiles.get(fileId)
        
        // Fallback to localStorage
        if (!fileData && typeof window !== 'undefined') {
          fileData = LocalStorageManager.getFile(fileId)
        }

        // Debug: Log what we found
        console.log('🔍 Debug - File data found:', {
          hasFileData: !!fileData,
          hasExtractedText: !!(fileData?.extractedText),
          textLength: fileData?.extractedText?.length || 0,
          processingMethod: fileData?.processingMethod,
          isFallback: fileData?.extractedText?.includes('Fallback Processing Results'),
          isUnknown: fileData?.extractedText?.includes('Document Analysis: unknown'),
          textPreview: fileData?.extractedText?.substring(0, 100) + '...'
        })

        // More flexible detection - accept any processed content that's not clearly fallback
        if (fileData && fileData.extractedText && 
            fileData.extractedText.length > 5 && 
            !fileData.extractedText.includes('Fallback Processing Results') &&
            !fileData.extractedText.includes('Document Analysis: unknown') &&
            !fileData.extractedText.includes('[PDF content - Textract processing required]')) {
          // Real document data found
          console.log('✅ Loading real document:', fileData.name, 'Method:', fileData.processingMethod)
          
          const realData: ProcessedFile = {
            id: fileId,
            name: fileData.name || "Unknown Document",
            type: fileData.type || "application/octet-stream",
            size: fileData.size || 0,
            extractedText: fileData.extractedText,
            summary: await generateAISummary(fileData.extractedText, fileData.name),
            transcription: fileData.transcription,
            processedAt: fileData.processingTime || fileData.uploadedAt || new Date().toISOString(),
            processingMethod: fileData.processingMethod || 'fixed-pdf-parser',
          }

          setFileData(realData)
          setError(null)
        } else if (fileData && fileData.extractedText) {
          // Show document even if it's fallback content
          console.log('⚠️ Loading document with fallback content:', fileData.name)
          
          const fallbackData: ProcessedFile = {
            id: fileId,
            name: fileData.name || "Unknown Document",
            type: fileData.type || "application/octet-stream",
            size: fileData.size || 0,
            extractedText: fileData.extractedText,
            summary: `**Document Summary: ${fileData.name}**\n\n**Status:** Document processed with limited content\n\n**Note:** This document was processed but contains limited or fallback content. Please try uploading a different version of the document.`,
            transcription: fileData.transcription,
            processedAt: fileData.processingTime || fileData.uploadedAt || new Date().toISOString(),
            processingMethod: fileData.processingMethod || 'fallback',
          }

          setFileData(fallbackData)
          setError(null)
        } else {
          // No data found at all
          setError(`Document "${fileId}" not found or not processed. Please upload and process a document first.`)
          setFileData(null)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading results:", error)
        setError("Failed to load document. Please try again.")
        setLoading(false)
      }
    }

    if (isBrowser) {
      loadResults()
    }
  }, [fileId, isBrowser])

  const saveTextToGoogleDrive = async () => {
    try {
      setIsSavingToDrive(true)
      setSaveToDriveMsg(null)
      const supabase = getSupabaseBrowser()
      const { data: { session } } = await supabase!.auth.getSession()
      const token = (session as any)?.provider_token
      if (!token) {
        setSaveToDriveMsg('Sign in with Google first (Settings → Sign in with Google).')
        return
      }
      if (!fileData) {
        setSaveToDriveMsg('No document loaded.')
        return
      }

      const boundary = 'voiceloop-' + Math.random().toString(36).slice(2)
      const metadata: any = {
        name: `${fileData.name.replace(/\.[^/.]+$/, '')}-voiceloop`,
        mimeType: 'application/vnd.google-apps.document'
      }
      if (selectedFolder?.id && selectedFolder.id !== 'root') {
        metadata.parents = [selectedFolder.id]
      }
      const body = [
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n',
        `--${boundary}\r\n` +
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
        (fileData.summary ? `Summary\n\n${fileData.summary}\n\n---\n\n` : '') +
        (fileData.extractedText || '') + '\r\n',
        `--${boundary}--`
      ].join('')

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Drive upload failed')
      }
      setSaveToDriveMsg('Saved to Google Drive successfully.')
    } catch (e: any) {
      setSaveToDriveMsg(e?.message || 'Failed to save to Google Drive')
    } finally {
      setIsSavingToDrive(false)
    }
  }

  // Generate AI summary from extracted text
  const generateAISummary = async (text: string, fileName: string): Promise<string> => {
    if (!text || text.length < 10) {
      return "**Document Summary**\n\n**Status:** Content too short for meaningful analysis\n\n**Note:** This document contains minimal text content."
    }

    try {
      const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('voiceloop_openai_key')
      
      if (openaiKey) {
        console.log('🚀 Attempting OpenAI analysis...')
        
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            fileName,
            fileType: 'application/pdf',
            openaiKey
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ OpenAI analysis successful')
          
          const analysis = result.analysis
          let summary = `**Document Summary: ${fileName}**\n\n`
          summary += `**Document Overview:**\n`
          summary += `• Total words: ${analysis.wordCount} (OpenAI)\n`
          summary += `• Document Type: ${analysis.documentType}\n`
          summary += `• Processing method: AWS Textract + OpenAI GPT-4\n`
          summary += `• AI Confidence: ${analysis.confidence}%\n`
          summary += `• Sentiment: ${analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)}\n\n`
          
          summary += `**AI-Generated Summary:**\n${analysis.summary}\n\n`
          
          summary += `**Key Business Points:**\n`
          analysis.keyPoints.slice(0, 5).forEach((point: string) => {
            summary += `• ${point}\n`
          })
          summary += `\n`
          
          summary += `**Main Business Topics:**\n`
          analysis.mainTopics.slice(0, 3).forEach((topic: string) => {
            summary += `• ${topic}\n`
          })
          summary += `\n`
          
          summary += `**Business Recommendations:**\n`
          analysis.recommendations.slice(0, 3).forEach((rec: string) => {
            summary += `• ${rec}\n`
          })
          summary += `\n`
          
          summary += `**Risk Factors Identified:**\n`
          analysis.riskFactors.slice(0, 3).forEach((risk: string) => {
            summary += `• ${risk}\n`
          })
          summary += `\n`
          
          summary += `**Action Items:**\n`
          analysis.actionItems.slice(0, 3).forEach((action: string) => {
            summary += `• ${action}\n`
          })
          summary += `\n`
          
          summary += `**✅ Real AI Analysis Complete**\n`
          summary += `This analysis was generated using OpenAI's GPT-4 model for intelligent business insights.`
          
          return summary
        }
      }
    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error)
    }

    // Production: Only OpenAI analysis, no fallbacks
    return `**Document Summary: ${fileName}**\n\n**Status: AI Analysis Required**\n\n**Current State:**\n• Document text extracted successfully via AWS Textract\n• AI analysis pending - OpenAI API key required\n\n**Next Steps:**\n• Configure OpenAI API key in Settings\n• Re-process document for AI insights\n• Contact administrator if issues persist\n\n**Note:** This is a production system requiring OpenAI integration for document analysis.`
  }

  const copyToClipboard = async (text: string) => {
    if (!isBrowser) return
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Copy failed. Please select and copy the text manually.')
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading || !isBrowser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse h-12 w-12 mx-auto mb-4">
            <Image
              src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
              alt="VoiceLoop"
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-muted-foreground font-light">
            {loading ? "Loading results..." : "Initializing..."}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <section className="py-8 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-light text-foreground mb-4">Document Not Found</h1>
            <p className="text-muted-foreground font-light mb-8 max-w-2xl mx-auto">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href="/upload">Upload New Document</Link>
              </Button>
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href="/dashboard">View All Documents</Link>
              </Button>
            </div>
          </div>

          {/* LinkedIn Post Generator */}
          <div className="mt-6">
            <h3 className="text-lg font-light mb-2">Create LinkedIn-ready Post</h3>
            <PostGenerator text={fileData.summary || fileData.extractedText} title={fileData.name} />
          </div>
        </section>
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-light">No document data available</p>
          <Button variant="outline" className="mt-4 bg-transparent" asChild>
            <Link href="/upload">Upload Document</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />
      
      {/* Upload Another Button */}
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md" asChild>
            <Link href="/upload">
              <ArrowLeft className="mr-2 h-4 w-4 text-primary" />
              Upload Another
            </Link>
          </Button>
        </div>
      </div>

      {/* Results Content */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Use the new DocumentViewer component */}
          <DocumentViewer
            document={{
              id: fileData.id,
              name: fileData.name,
              type: fileData.type,
              size: fileData.size,
              extractedText: fileData.extractedText,
              summary: fileData.summary,
              transcription: fileData.transcription,
              processedAt: fileData.processedAt,
              processingMethod: fileData.processingMethod,
              userId: undefined
            }}
            onViewInDashboard={() => {
              // Navigate to dashboard
              window.location.href = '/dashboard'
            }}
            onStartVoiceChat={() => {
              const el = document.getElementById('inline-voice-chat')
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
          />

          {/* Unified Save Option */}
          <div className="mt-6">
            <UnifiedSaveButton
              documentId={fileData.id}
              documentName={fileData.name}
              extractedText={fileData.extractedText}
              userId={undefined}
              onSaveComplete={() => {
                // Refresh the page to show updated state
                window.location.reload()
              }}
            />
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                className="font-montserrat-light bg-transparent"
                onClick={() => setFolderPickerOpen(true)}
              >
                {selectedFolder ? `Folder: ${selectedFolder.name}` : 'Choose Drive Folder'}
              </Button>
              <Button
                variant="outline"
                className="font-montserrat-light bg-transparent"
                disabled={isSavingToDrive}
                onClick={saveTextToGoogleDrive}
              >
                {isSavingToDrive ? 'Saving to Drive…' : 'Save to Google Drive'}
              </Button>
              {saveToDriveMsg && (
                <span className="text-sm text-muted-foreground">{saveToDriveMsg}</span>
              )}
            </div>
          </div>

          <GoogleDriveFolderPicker
            open={folderPickerOpen}
            onClose={() => setFolderPickerOpen(false)}
            onPicked={(f) => setSelectedFolder(f)}
          />

          {/* OpenAI Settings helper */}
          {typeof window !== 'undefined' && !localStorage.getItem('voiceloop_openai_key') && (
            <div className="mt-8">
              <OpenAISettings />
            </div>
          )}




        </div>
      </section>

      {/* Inline Unified Voice Chat */}
      {fileData && (
        <div id="inline-voice-chat" className="container mx-auto px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <UnifiedVoiceChat documentText={fileData.extractedText} documentName={fileData.name} />
          </div>
        </div>
      )}
    </div>
  )
}
