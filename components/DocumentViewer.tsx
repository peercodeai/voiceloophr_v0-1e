"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Search,
  MessageCircle,
  Share2,
  Bookmark,
  User,
  Hash,
  Clock,
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Music, 
  Video as VideoIcon
} from "lucide-react"
// Calendar integration removed
// Removed modal viewer usage to simplify UX; in-tab viewer is used
import dynamic from 'next/dynamic'

// Create a client-side only PDF viewer component
const ClientPDFViewer = dynamic(() => import('./ClientPDFViewer'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <div className="animate-pulse h-12 w-12 mx-auto mb-4">
        <Image
          src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
          alt="VoiceLoop"
          width={48}
          height={48}
          className="h-full w-full object-contain"
        />
      </div>
      <p className="text-lg font-light">Loading PDF viewer...</p>
    </div>
  )
})

interface DocumentViewerProps {
  document: {
    id: string
    name: string
    type: string
    size: number
    extractedText: string
    summary: string
    transcription?: string
    processedAt: string
    processingMethod?: string
    userId?: string
  }
  onViewInDashboard?: () => void
  onStartVoiceChat?: () => void
}

export function DocumentViewer({ 
  document, 
  onViewInDashboard, 
  onStartVoiceChat 
}: DocumentViewerProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("summary")
  // Removed blue modal state; we render in-tab only
  const [fileData, setFileData] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingFileData, setLoadingFileData] = useState(false)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getFileTypeIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("audio")) return <MessageCircle className="h-5 w-5 text-purple-500" />
    if (type.includes("video")) return <Eye className="h-5 w-5 text-orange-500" />
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  const getProcessingMethodLabel = (method?: string) => {
    switch (method) {
      case 'fixed-pdf-parser': return 'Free PDF Parser'
      case 'textract': return 'AWS Textract'
      case 'whisper': return 'OpenAI Whisper'
      default: return method || 'Unknown'
    }
  }

  const fetchFileData = async (fileId: string) => {
    try {
      setLoadingFileData(true)
      console.log(`🔍 DocumentViewer: Fetching file data for ID: ${fileId}`)
      const response = await fetch(`/api/files/${fileId}`)
      console.log(`📡 DocumentViewer: Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ DocumentViewer: API error ${response.status}:`, errorText)
        // Try client-side fallback: read from localStorage if present
        try {
          const local = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
          const found = local[fileId]
          const b64 = found?.localBase64
          if (b64) {
            console.log('📦 Using localBase64 fallback from localStorage')
            setFileData(b64)
            return b64
          }
        } catch {}
        throw new Error(`Failed to fetch file data: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`📄 DocumentViewer: Response data:`, result)
      
      if (result.success) {
        if (result.file?.signedUrl) {
          setSignedUrl(result.file.signedUrl)
        } else {
          setSignedUrl(null)
        }
        if (result.file?.buffer) {
          console.log(`✅ DocumentViewer: File data loaded successfully`)
          setFileData(result.file.buffer)
          return result.file.buffer
        }
        if (result.file?.signedUrl) {
          return null
        }
      } else {
        console.error(`❌ DocumentViewer: No file data in response:`, result)
        throw new Error('No file data available in response')
      }
    } catch (error) {
      console.error('❌ DocumentViewer: Error fetching file data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch file data')
      setFileData(null)
      return null
    } finally {
      setLoadingFileData(false)
    }
  }

  // No separate modal open handler

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card className="p-6 border-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {getFileTypeIcon(document.type)}
            </div>
            <div>
              <h1 className="text-2xl font-light text-foreground mb-2">{document.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-light">
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {document.id.slice(0, 8)}...
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {formatFileSize(document.size)}
                </span>
                <Badge variant="outline" className="font-light border-2 border-primary/30 bg-primary/5 text-primary">
                  {document.type.split("/")[1]?.toUpperCase() || "FILE"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              onClick={onStartVoiceChat}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Voice Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              onClick={onViewInDashboard}
            >
              <Eye className="mr-2 h-4 w-4" />
              View in Dashboard
            </Button>
          </div>
        </div>

        {/* Processing Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {document.extractedText.split(/\s+/).filter(word => word.length > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {document.extractedText.length}
            </div>
            <div className="text-xs text-muted-foreground">Characters</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {getProcessingMethodLabel(document.processingMethod)}
            </div>
            <div className="text-xs text-muted-foreground">Method</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {formatDate(document.processedAt)}
            </div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
        </div>
      </Card>

      {/* Document Content Tabs */}
      <Card className="border-2 border-primary/20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-primary/5 border-b border-primary/20">
            <TabsTrigger value="summary" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="content" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Eye className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
            {document.transcription && (
              <TabsTrigger value="transcription" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageCircle className="mr-2 h-4 w-4" />
                Audio
              </TabsTrigger>
            )}
            <TabsTrigger value="viewer" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Document Viewer
            </TabsTrigger>
            <TabsTrigger value="metadata" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-foreground">AI-Generated Summary</h2>
              <Button
                variant="outline"
                size="sm"
                className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                onClick={() => copyToClipboard(document.summary, 'summary')}
              >
                {copied === 'summary' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied === 'summary' ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm font-light leading-relaxed text-foreground">
                {document.summary}
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-foreground">Extracted Content</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  onClick={() => copyToClipboard(document.extractedText, 'content')}
                >
                  {copied === 'content' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === 'content' ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm font-light leading-relaxed text-foreground whitespace-pre-wrap">
                {document.extractedText}
              </div>
            </div>
          </TabsContent>

          {/* Transcription Tab (if available) */}
          {document.transcription && (
            <TabsContent value="transcription" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-foreground">Audio Transcription</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  onClick={() => copyToClipboard(document.transcription!, 'transcription')}
                >
                  {copied === 'transcription' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === 'transcription' ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted/20 rounded-lg p-4">
                <div className="text-sm font-light leading-relaxed text-foreground">
                  {document.transcription}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Document Viewer Tab */}
          <TabsContent value="viewer" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-foreground">Document Viewer</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  onClick={() => copyToClipboard(document.extractedText, 'viewer')}
                >
                  {copied === 'viewer' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === 'viewer' ? "Copied!" : "Copy Text"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="font-light"
                  onClick={async () => {
                    if (!confirm('Delete this file and its stored copy?')) return
                    try {
                      const res = await fetch(`/api/files/${document.id}`, { method: 'DELETE' })
                      if (res.ok) {
                        alert('File deleted')
                      } else {
                        const t = await res.text()
                        alert('Delete failed: ' + t)
                      }
                    } catch (e) {
                      alert('Delete error')
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            
            {/* Integrated Document Viewer */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm min-h-[600px]">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{document.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {document.type} • {formatFileSize(document.size)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 h-full">
                <DocumentViewerContent 
                  document={document}
                  fileData={fileData}
                  signedUrl={signedUrl}
                  loadingFileData={loadingFileData}
                  onLoadFileData={() => fetchFileData(document.id)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Calendar Tab - REMOVED */}

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="p-6">
            <h2 className="text-xl font-light text-foreground mb-4">Document Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Name:</span>
                  <span className="font-medium text-foreground">{document.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Document ID:</span>
                  <span className="font-medium text-foreground font-mono">{document.id}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Type:</span>
                  <span className="font-medium text-foreground">{document.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="font-medium text-foreground">{formatFileSize(document.size)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Processed:</span>
                  <span className="font-medium text-foreground">{formatDate(document.processedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium text-foreground">{getProcessingMethodLabel(document.processingMethod)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Words:</span>
                  <span className="font-medium text-foreground">
                    {document.extractedText.split(/\s+/).filter(word => word.length > 0).length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Characters:</span>
                  <span className="font-medium text-foreground">{document.extractedText.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          size="lg" 
          className="font-light bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 px-8"
          onClick={onStartVoiceChat}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Start Voice Chat
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="font-light border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary px-8"
          onClick={onViewInDashboard}
        >
          <Eye className="mr-2 h-5 w-5" />
          View in Dashboard
        </Button>
      </div>

      {/* Modal viewer removed */}
    </div>
  )
}

// Document Viewer Content Component
interface DocumentViewerContentProps {
  document: {
    id: string
    name: string
    type: string
    size: number
    extractedText: string
  }
  fileData: string | null
  signedUrl?: string | null
  loadingFileData: boolean
  onLoadFileData: () => void
}

function DocumentViewerContent({ 
  document, 
  fileData, 
  signedUrl,
  loadingFileData, 
  onLoadFileData 
}: DocumentViewerContentProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!fileData) {
      setNumPages(null)
      setPageNumber(1)
      setScale(1.0)
      setRotation(0)
      setPdfError(null)
    }
  }, [fileData])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    setPdfError(null)
  }

  function onDocumentLoadError(error: any) {
    console.error('Error loading PDF document:', error)
    setPdfError('Failed to load PDF document. It might be corrupted or unsupported.')
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      if (numPages === null) return prevPageNumber
      return Math.max(1, Math.min(prevPageNumber + offset, numPages))
    })
  }

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.1, 3.0))
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.1, 0.5))
  const rotate = () => setRotation(prevRotation => (prevRotation + 90) % 360)

  const fileUrl = fileData ? `data:${document.type};base64,${fileData}` : null

  const renderContent = () => {
    if (!fileData && !loadingFileData) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-lg mb-2">Document not loaded</p>
          <p className="text-sm mb-4">Click the button below to load the original document.</p>
          <Button
            onClick={onLoadFileData}
            className="font-light bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Load Document
          </Button>
        </div>
      )
    }

    if (loadingFileData) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="animate-pulse h-12 w-12 mx-auto mb-4">
            <Image
              src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
              alt="VoiceLoop"
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-lg font-light">Loading document...</p>
        </div>
      )
    }

    if (!fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-lg">No file data available for preview.</p>
          <p className="text-sm">Please ensure the file was uploaded correctly.</p>
        </div>
      )
    }

    // Helper to decode base64 to UTF-8 string
    const decodeBase64 = (b64: string | null): string | null => {
      if (!b64) return null
      try {
        // atob gives latin1; decodeURIComponent(escape()) converts to UTF-8
        return decodeURIComponent(escape(atob(b64)))
      } catch {
        try { return atob(b64) } catch { return null }
      }
    }

    // Markdown preview (lightweight)
    const isMarkdown = document.type.includes("markdown") || document.name?.toLowerCase().endsWith('.md')
    if (isMarkdown) {
      const md = decodeBase64(fileData) || document.extractedText || ''
      return (
        <div className="h-[70vh] overflow-auto rounded-md border p-4 bg-muted/10">
          <pre className="whitespace-pre-wrap text-sm leading-6 font-light text-foreground">
            {md}
          </pre>
        </div>
      )
    }

    // CSV preview (lightweight parser)
    const isCsv = document.type.includes('csv') || document.name?.toLowerCase().endsWith('.csv')
    if (isCsv) {
      const csvText = decodeBase64(fileData) || document.extractedText || ''
      const parseCsv = (text: string): string[][] => {
        const rows: string[][] = []
        let row: string[] = []
        let cur = ''
        let inside = false
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          if (inside) {
            if (ch === '"') {
              if (text[i + 1] === '"') { cur += '"'; i++ } else { inside = false }
            } else { cur += ch }
          } else {
            if (ch === '"') inside = true
            else if (ch === ',') { row.push(cur); cur = '' }
            else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
            else if (ch === '\r') { /* ignore */ }
            else { cur += ch }
          }
        }
        row.push(cur); rows.push(row)
        return rows
      }
      const rows = parseCsv(csvText)
      return (
        <div className="h-[70vh] overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className={idx === 0 ? 'bg-muted/20 font-medium' : ''}>
                  {r.map((c, cidx) => (
                    <td key={cidx} className="border-b border-border/40 px-3 py-2 align-top whitespace-pre-wrap">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Prefer signed URL when available
    if (document.type.includes("pdf")) {
      const pdfUrl = signedUrl || `data:application/pdf;base64,${fileData}`
      return (
        <iframe src={pdfUrl} className="w-full h-[70vh] rounded-md border" />
      )
    } else if (document.type.startsWith("image/")) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <img src={signedUrl || fileUrl || undefined} alt={document.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
        </div>
      )
    } else if (document.type.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Music className="h-16 w-16 text-primary mb-4" />
          <audio controls src={signedUrl || fileUrl || undefined} className="w-full max-w-md"></audio>
          <p className="text-sm text-muted-foreground mt-2">Audio file preview</p>
        </div>
      )
    } else if (document.type.startsWith("video/")) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <VideoIcon className="h-16 w-16 text-primary mb-4" />
          <video controls src={signedUrl || fileUrl || undefined} className="w-full max-w-xl rounded-lg shadow-lg"></video>
          <p className="text-sm text-muted-foreground mt-2">Video file preview</p>
        </div>
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <FileText className="h-12 w-12 mb-4" />
          <p className="text-lg">Unsupported file type for direct preview.</p>
          <p className="text-sm">Extracted text is available in the "Content" tab.</p>
        </div>
      )
    }
  }

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  )
}
