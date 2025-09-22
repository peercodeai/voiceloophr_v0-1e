import { NextRequest, NextResponse } from 'next/server'
import { RAGService } from '@/lib/ragService'

interface SearchRequestBody {
  query: string
  userId?: string
  limit?: number
  threshold?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequestBody
    const query = body?.query?.trim()
    const userId = body?.userId
    const limit = Math.min(Math.max(body?.limit ?? 10, 1), 50)
    const threshold = body?.threshold ?? 0.1

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Use our RAG service for semantic search
    const searchResult = await RAGService.searchDocuments(query, userId, limit, threshold)

    if (!searchResult.success) {
      return NextResponse.json({ 
        error: searchResult.error || 'Search failed', 
        code: 'SEARCH_ERROR' 
      }, { status: 500 })
    }

    // Transform results to match the expected interface
    const transformedResults = searchResult.results.map(result => ({
      id: result.id,
      fileName: result.fileName,
      title: result.fileName,
      snippet: result.chunkText.substring(0, 200) + '...',
      relevanceScore: result.similarity,
      fileType: 'document',
      uploadedAt: result.createdAt,
      matchedChunks: [result.chunkText.substring(0, 150) + '...']
    }))

    return NextResponse.json({ 
      success: true, 
      results: transformedResults, 
      totalResults: transformedResults.length 
    })

  } catch (err) {
    console.error('Semantic search error:', err)
    return NextResponse.json({ 
      error: 'Internal server error during search', 
      code: 'UNKNOWN',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}


