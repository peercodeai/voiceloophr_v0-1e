"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Info, Database, HardDrive, Star, Users, Zap, Shield, Globe, Play, FileText, MessageCircle, Search } from "lucide-react"
import Link from "next/link"

interface GuestStats {
  totalDocuments: number
  totalChunks: number
  avgChunkSize: number
  featuresUsed: string[]
}

interface SampleDocument {
  id: string
  name: string
  type: string
  size: number
  summary: string
  category: string
}

export default function EnhancedGuestMode() {
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestStats, setGuestStats] = useState<GuestStats>({
    totalDocuments: 0,
    totalChunks: 0,
    avgChunkSize: 0,
    featuresUsed: []
  })
  const [showSampleData, setShowSampleData] = useState(false)

  // Sample documents for investors to explore
  const sampleDocuments: SampleDocument[] = [
    {
      id: "sample-1",
      name: "Employee Handbook 2024",
      type: "PDF",
      size: 2048000,
      summary: "Comprehensive guide covering company policies, benefits, and procedures for all employees.",
      category: "HR Documents"
    },
    {
      id: "sample-2", 
      name: "Q3 Financial Report",
      type: "PDF",
      size: 1536000,
      summary: "Detailed financial analysis including revenue, expenses, and growth projections for Q3 2024.",
      category: "Financial Reports"
    },
    {
      id: "sample-3",
      name: "Product Roadmap 2025",
      type: "DOCX",
      size: 1024000,
      summary: "Strategic product development plan outlining key features and milestones for the upcoming year.",
      category: "Strategy Documents"
    },
    {
      id: "sample-4",
      name: "Customer Feedback Analysis",
      type: "XLSX",
      size: 512000,
      summary: "Analysis of customer feedback data with insights and recommendations for product improvements.",
      category: "Analytics"
    }
  ]

  useEffect(() => {
    const checkGuestMode = () => {
      try {
        // Check if we're in guest mode (no Supabase configured)
        const guestChunks = JSON.parse(localStorage.getItem('voiceloop_guest_chunks') || '[]')
        const uploadedFiles = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        
        if (guestChunks.length > 0 || Object.keys(uploadedFiles).length > 0) {
          setIsGuestMode(true)
          
          // Calculate stats
          const uniqueDocuments = new Set(guestChunks.map((chunk: any) => 
            chunk.documentId || chunk.document_id
          )).size
          
          const avgChunkSize = guestChunks.length > 0 ? 
            guestChunks.reduce((sum: number, chunk: any) => {
              const text = chunk.chunkText || chunk.chunk_text || ''
              return sum + text.length
            }, 0) / guestChunks.length : 0

          // Track features used
          const featuresUsed = []
          if (localStorage.getItem('voiceloop_uploaded_files')) featuresUsed.push('Document Upload')
          if (localStorage.getItem('voiceloop_guest_chunks')) featuresUsed.push('Semantic Search')
          if (localStorage.getItem('voiceloop_openai_key')) featuresUsed.push('AI Analysis')
          if (localStorage.getItem('voiceloop_elevenlabs_key')) featuresUsed.push('Voice Features')

          setGuestStats({
            totalDocuments: uniqueDocuments,
            totalChunks: guestChunks.length,
            avgChunkSize: Math.round(avgChunkSize),
            featuresUsed
          })
        }
      } catch (error) {
        console.warn('Error checking guest mode:', error)
      }
    }

    checkGuestMode()
    
    const handleStorageChange = () => {
      checkGuestMode()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const loadSampleData = () => {
    try {
      // Store sample documents in localStorage for demo
      const sampleFiles = sampleDocuments.reduce((acc, doc) => {
        acc[doc.id] = {
          id: doc.id,
          name: doc.name,
          type: `application/${doc.type.toLowerCase()}`,
          size: doc.size,
          extractedText: `${doc.summary}\n\nThis is a sample document for demonstration purposes. In a real scenario, this would contain the full document content extracted from the ${doc.type} file. The document has been processed and is ready for AI analysis, semantic search, and voice chat interactions.`,
          summary: doc.summary,
          uploadedAt: new Date().toISOString(),
          processingMethod: 'sample-data'
        }
        return acc
      }, {} as any)

      localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(sampleFiles))
      
      // Create sample chunks for semantic search
      const sampleChunks = sampleDocuments.flatMap(doc => [
        {
          document_id: doc.id,
          chunk_index: 0,
          chunk_text: doc.summary,
          metadata: { category: doc.category, type: doc.type }
        }
      ])
      
      localStorage.setItem('voiceloop_guest_chunks', JSON.stringify(sampleChunks))
      setShowSampleData(true)
      
      // Refresh stats
      window.dispatchEvent(new Event('storage'))
    } catch (error) {
      console.error('Error loading sample data:', error)
    }
  }

  if (!isGuestMode && !showSampleData) {
    return (
      <Card className="p-6 border-2 border-dashed border-primary/30 bg-primary/5">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-montserrat-light mb-2">Explore VoiceLoop HR</h3>
          <p className="text-muted-foreground font-montserrat-light mb-6 max-w-md mx-auto">
            Try our platform with sample data. Upload documents, test AI analysis, and experience voice features without creating an account.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium text-sm">Document Upload</div>
                <div className="text-xs text-muted-foreground">PDF, DOCX, TXT, and more</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium text-sm">AI Voice Chat</div>
                <div className="text-xs text-muted-foreground">Talk to your documents</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <Search className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium text-sm">Semantic Search</div>
                <div className="text-xs text-muted-foreground">Find info naturally</div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={loadSampleData}
            className="font-montserrat-light"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Load Sample Data & Explore
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            Perfect for investors, evaluators, and potential customers
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex items-start gap-3">
        <HardDrive className="h-5 w-5 text-blue-600 mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Guest Mode Active
            </h4>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
              Demo Environment
            </Badge>
          </div>
          
          <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
            {showSampleData ? 
              "Sample data loaded! Explore all features with pre-loaded documents." :
              "Documents are stored locally in your browser. Data persists between sessions but is not synced to the cloud."
            }
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-600 dark:text-blue-300 mb-4">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{guestStats.totalDocuments} docs</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{guestStats.totalChunks} chunks</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{guestStats.featuresUsed.length} features</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Local storage</span>
            </div>
          </div>
          
          {guestStats.featuresUsed.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {guestStats.featuresUsed.map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <Link href="/upload">
                <FileText className="h-3 w-3 mr-1" />
                Upload More
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <Link href="/search">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <Link href="/chat">
                <MessageCircle className="h-3 w-3 mr-1" />
                AI Chat
              </Link>
            </Button>
          </div>
        </div>
        <Info className="h-4 w-4 text-blue-500 mt-1" />
      </div>
    </Card>
  )
}
