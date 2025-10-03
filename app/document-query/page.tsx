'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Brain, TrendingUp, Files, Calendar, Tag, Download } from 'lucide-react'

interface DocumentData {
  id: string
  fileName: string
  extractedText: string
  wordCount: number
  uploadDate: string
  fileType: string
  tags?: string[]
  analysis?: {
    summary: string
    keyTopics: string[]
    documentType: string
    confidence: number
  }
}

interface QueryResults {
  analysis: string
  insights?: {
    relevantDocuments: Array<{
      fileName: string
      wordCount: number
    }>
    keyFindings: string[]
    recommendations: string[]
  }
}

export default function DocumentQueryPage() {
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [queryResults, setQueryResults] = useState<QueryResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'type'>('all')

  // Load documents from your existing storage system
  useEffect(() => {
    const loadDocuments = async () => {
      // This would integrate with your existing global storage
      const mockDocuments: DocumentData[] = [
        {
          id: 'file_1759460611417_8rhtjq4s8',
          fileName: '9.14.25_IP_Analysis.pdf',
          extractedText: 'Intellectual Property Analysis document covering patent landscape, competitive positioning, and technology trends in the AI/ML space. Includes market analysis and strategic recommendations for IP portfolio development.',
          wordCount: 1628,
          uploadDate: '2024-01-15',
          fileType: 'PDF',
          tags: ['IP', 'Analysis', 'Patents', 'Technology'],
          analysis: {
            summary: 'Comprehensive IP analysis covering AI/ML patent landscape and competitive positioning',
            keyTopics: ['Intellectual Property', 'Patents', 'AI/ML', 'Market Analysis'],
            documentType: 'Business Analysis',
            confidence: 95
          }
        },
        {
          id: 'file_1759460611418_9shtkq5t9',
          fileName: 'TooltipCompanion_Browser_Valuation_and_Monetization.pdf',
          extractedText: 'Browser extension monetization strategy and valuation analysis. Covers user acquisition, revenue models, and market opportunity assessment for browser-based productivity tools.',
          wordCount: 2341,
          uploadDate: '2024-01-10',
          fileType: 'PDF',
          tags: ['Valuation', 'Monetization', 'Browser Extension', 'Strategy'],
          analysis: {
            summary: 'Strategic analysis of browser extension market opportunities and monetization models',
            keyTopics: ['Valuation', 'Monetization', 'Browser Technology', 'Market Strategy'],
            documentType: 'Business Strategy',
            confidence: 92
          }
        },
        {
          id: 'file_1759460611419_0tiulr6u0',
          fileName: 'Shine_IP.pdf',
          extractedText: 'Comprehensive intellectual property strategy for a fintech startup. Includes patent filing strategy, competitive analysis, and technology roadmap for financial services innovation.',
          wordCount: 1892,
          uploadDate: '2024-01-08',
          fileType: 'PDF',
          tags: ['Fintech', 'IP Strategy', 'Patents', 'Startup'],
          analysis: {
            summary: 'Fintech startup IP strategy with patent filing roadmap and competitive positioning',
            keyTopics: ['Financial Technology', 'IP Strategy', 'Patent Filing', 'Competitive Analysis'],
            documentType: 'IP Strategy',
            confidence: 88
          }
        },
        {
          id: 'file_1759460611420_1ujvms7v1',
          fileName: 'Market_Research_Report.pdf',
          extractedText: 'Market research analysis covering industry trends, consumer behavior, and competitive landscape. Includes data on market size, growth projections, and strategic recommendations.',
          wordCount: 3456,
          uploadDate: '2024-01-05',
          fileType: 'PDF',
          tags: ['Market Research', 'Industry Analysis', 'Consumer Behavior', 'Strategy'],
          analysis: {
            summary: 'Comprehensive market research with industry trends and strategic recommendations',
            keyTopics: ['Market Analysis', 'Consumer Research', 'Industry Trends', 'Strategic Planning'],
            documentType: 'Market Research',
            confidence: 94
          }
        }
      ]
      setDocuments(mockDocuments)
    }
    loadDocuments()
  }, [])

  const filteredDocuments = documents.filter(doc => {
    if (filterBy === 'recent') {
      const docDate = new Date(doc.uploadDate)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return docDate > weekAgo
    }
    if (filterBy === 'type') {
      return doc.fileType === 'PDF'
    }
    return true
  })

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    )
  }

  const handleQueryAllDocuments = async () => {
    if (!searchQuery.trim()) return
    
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/query-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          allDocuments: true 
        })
      })
      
      if (response.ok) {
        const results = await response.json()
        setQueryResults(results)
      }
    } catch (error) {
      console.error('Query error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCompareDocuments = async () => {
    if (selectedDocuments.length < 2) return
    
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentIds: selectedDocuments,
          query: 'Compare and analyze these documents'
        })
      })
      
      if (response.ok) {
        const results = await response.json()
        setQueryResults(results)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Communication Hub</h1>
          <p className="text-muted-foreground">
            Communicate with your documents using natural language queries and voice commands
          </p>
        </div>

        {/* Search and Query Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Natural Language Query
            </CardTitle>
            <CardDescription>
              Ask questions in plain English across all your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="e.g., 'What are the main topics discussed?' or 'Summarize the key findings' or 'Find information about pricing strategies'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleQueryAllDocuments} disabled={isAnalyzing}>
                <Brain className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Processing...' : 'Ask Documents'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Available Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5" />
                Your Documents ({filteredDocuments.length})
              </CardTitle>
              <CardDescription>
                Select documents to query or compare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Options */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={filterBy === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('recent')}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Recent
                </Button>
                <Button
                  variant={filterBy === 'type' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterBy('type')}
                >
                  PDFs
                </Button>
              </div>

              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocuments.includes(doc.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleDocumentSelect(doc.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium truncate">{doc.fileName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{doc.wordCount} words</span>
                          <span>•</span>
                          <span>{doc.fileType}</span>
                          <span>•</span>
                          <span>{doc.uploadDate}</span>
                        </div>
                        {doc.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{doc.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => handleDocumentSelect(doc.id)}
                        className="ml-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedDocuments.length >= 2 && (
                <Button 
                  onClick={handleCompareDocuments} 
                  className="w-full mt-4"
                  disabled={isAnalyzing}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {isAnalyzing ? 'Analyzing...' : `Analyze ${selectedDocuments.length} Documents`}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Document Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Document Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Documents</span>
                  <Badge variant="outline">{documents.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Selected for Query</span>
                  <Badge variant="outline">{selectedDocuments.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Content</span>
                  <Badge variant="outline">{documents.reduce((sum, doc) => sum + doc.wordCount, 0).toLocaleString()} words</Badge>
                </div>
                <div className="flex justify-between">
                  <span>File Types</span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(documents.map(doc => doc.fileType))).map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Content Topics</span>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">Analysis</Badge>
                    <Badge variant="secondary" className="text-xs">Research</Badge>
                    <Badge variant="secondary" className="text-xs">Strategy</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query Results */}
        {queryResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Query Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{queryResults.analysis}</div>
                
                {queryResults.insights && (
                  <div className="mt-6 space-y-4">
                    {queryResults.insights.relevantDocuments && queryResults.insights.relevantDocuments.length > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Relevant Documents</h3>
                        <div className="space-y-2">
                          {queryResults.insights.relevantDocuments.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{doc.fileName}</span>
                              <Badge variant="outline">{doc.wordCount} words</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {queryResults.insights.keyFindings && queryResults.insights.keyFindings.length > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <h3 className="font-semibold mb-2">Key Findings</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {queryResults.insights.keyFindings.map((finding: string, index: number) => (
                            <li key={index} className="text-sm">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {queryResults.insights.recommendations && queryResults.insights.recommendations.length > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <h3 className="font-semibold mb-2">Recommendations</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {queryResults.insights.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Button className="mt-4" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
