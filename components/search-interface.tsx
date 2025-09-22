"use client"

import type React from "react"
import { getSupabaseBrowser } from '@/lib/supabase-browser'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, File, Music, Video, Clock, Star, Loader2 } from "lucide-react"
import { SophisticatedLoader } from "@/components/sophisticated-loader"

interface SearchResult {
  id: string
  fileName: string
  title: string
  snippet: string
  relevanceScore: number
  fileType: string
  uploadedAt: string
  matchedChunks: string[]
}

interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  totalResults: number
  searchTime: string
}

export default function SearchInterface() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState("")
  const [totalResults, setTotalResults] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // Check if we're in guest mode (no Supabase configured)
      let isGuestMode = false
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          isGuestMode = true
        }
      } catch {
        isGuestMode = true
      }

      if (isGuestMode) {
        // Handle guest mode search on client side
        await handleGuestModeSearch(query)
        return
      }

      // Include userId if signed in
      let userId: string | undefined
      try {
        const supabase = getSupabaseBrowser()
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id
        }
      } catch {}

      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, userId }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        let err: any = {}
        try { err = JSON.parse(text) } catch {}
        console.error('Search failed:', err || text)
        throw new Error(err?.error || text || "Search failed")
      }

      const data = await response.json()
      setResults(data.results || [])
      setTotalResults(data.totalResults || (data.results?.length ?? 0))
      setSearchTime("")
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
      setTotalResults(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleGuestModeSearch = async (query: string) => {
    try {
      // Get chunks from localStorage
      const storedChunks = JSON.parse(localStorage.getItem('voiceloop_guest_chunks') || '[]')
      
      if (storedChunks.length === 0) {
        setResults([])
        setTotalResults(0)
        setSearchTime("")
        return
      }

      // Simple text-based search for guest mode
      const queryLower = query.toLowerCase()
      const results: any[] = []

      for (const chunk of storedChunks) {
        const chunkText = chunk.chunkText || chunk.chunk_text || ''
        const chunkLower = chunkText.toLowerCase()
        
        // Calculate simple relevance score based on text matching
        let score = 0
        const words = queryLower.split(' ').filter(word => word.length > 2)
        
        for (const word of words) {
          if (chunkLower.includes(word)) {
            score += 1
          }
        }
        
        // Normalize score
        const relevanceScore = words.length > 0 ? score / words.length : 0
        
        if (relevanceScore >= 0.1) { // Lower threshold for guest mode
          results.push({
            id: chunk.id,
            fileName: chunk.fileName || chunk.file_name,
            title: chunk.fileName || chunk.file_name,
            snippet: chunkText.substring(0, 200) + '...',
            relevanceScore: relevanceScore,
            fileType: 'document',
            uploadedAt: chunk.createdAt || chunk.created_at,
            matchedChunks: [chunkText.substring(0, 150) + '...']
          })
        }
      }

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10)

      console.log(`Guest mode search found ${sortedResults.length} results for query: "${query}"`)
      
      setResults(sortedResults)
      setTotalResults(sortedResults.length)
      setSearchTime("")
    } catch (error) {
      console.error("Guest mode search error:", error)
      setResults([])
      setTotalResults(0)
      setSearchTime("")
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />
      case "markdown":
      case "md":
        return <File className="h-5 w-5 text-blue-500" />
      case "csv":
        return <File className="h-5 w-5 text-green-500" />
      case "wav":
      case "audio":
        return <Music className="h-5 w-5 text-purple-500" />
      case "mp4":
      case "video":
        return <Video className="h-5 w-5 text-orange-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return "text-green-600"
    if (score >= 0.8) return "text-yellow-600"
    return "text-gray-600"
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="p-6 border-thin">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all your documents..."
                className="pl-10 font-light"
                disabled={isSearching}
              />
            </div>
            <Button type="submit" disabled={!query.trim() || isSearching} className="font-light px-8">
              {isSearching ? (
                <div className="h-4 w-4 mr-2">
                  <SophisticatedLoader size="sm" />
                </div>
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground font-light">
            <p>Use natural language to search across all your uploaded documents. Try queries like:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className="font-light cursor-pointer"
                onClick={() => setQuery("budget analysis")}
              >
                "budget analysis"
              </Badge>
              <Badge
                variant="outline"
                className="font-light cursor-pointer"
                onClick={() => setQuery("project timeline")}
              >
                "project timeline"
              </Badge>
              <Badge
                variant="outline"
                className="font-light cursor-pointer"
                onClick={() => setQuery("meeting decisions")}
              >
                "meeting decisions"
              </Badge>
            </div>
          </div>
        </form>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-light text-foreground">
              {totalResults > 0 ? `Found ${totalResults} results` : "No results found"}
              {query && <span className="text-muted-foreground"> for "{query}"</span>}
            </h2>
            {searchTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-light">{searchTime}</span>
              </div>
            )}
          </div>

          {/* Results List */}
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="p-6 border-thin hover:border-accent/50 transition-colors cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(result.fileType)}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground truncate">{result.title}</h3>
                          <p className="text-sm text-muted-foreground font-light">{result.fileName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Star className={`h-4 w-4 ${getRelevanceColor(result.relevanceScore)}`} />
                          <span className={`text-sm font-light ${getRelevanceColor(result.relevanceScore)}`}>
                            {Math.round(result.relevanceScore * 100)}%
                          </span>
                        </div>
                        <Badge variant="outline" className="font-light">
                          {result.fileType.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Snippet */}
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">{result.snippet}</p>

                    {/* Matched Chunks */}
                    {result.matchedChunks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Relevant sections:</p>
                        <div className="space-y-1">
                          {result.matchedChunks.map((chunk, index) => (
                            <div
                              key={index}
                              className="text-xs text-muted-foreground font-light bg-muted/50 p-2 rounded"
                            >
                              "{chunk}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-light">Uploaded {formatDate(result.uploadedAt)}</span>
                      <Button variant="outline" size="sm" className="font-light bg-transparent">
                        View Document
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : hasSearched && !isSearching ? (
            <Card className="p-8 text-center border-thin">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-light text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground font-light">
                Try different keywords or upload more documents to search through.
              </p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
