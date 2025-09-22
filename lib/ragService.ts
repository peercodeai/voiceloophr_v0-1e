import { supabaseAdmin } from '@/lib/supabase'
import { AIService } from './aiService'

export interface DocumentChunk {
  id: string
  documentId: string
  fileName: string
  chunkText: string
  chunkIndex: number
  chunkSize: number
  embedding?: number[]
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  userId?: string
}

export interface SearchResult {
  id: string
  documentId: string
  fileName: string
  chunkText: string
  chunkIndex: number
  chunkSize: number
  similarity: number
  metadata: Record<string, any>
}

export interface RAGStats {
  totalDocuments: number
  totalChunks: number
  totalEmbeddings: number
  avgChunkSize: number
  oldestDocument: string
  newestDocument: string
}

export class RAGService {
  private static readonly CHUNK_SIZE = 1000 // characters per chunk
  private static readonly CHUNK_OVERLAP = 200 // overlap between chunks
  private static readonly GUEST_STORAGE_KEY = 'voiceloop_guest_chunks'

  /**
   * Process a document and save it for semantic search
   */
  static async processDocumentForSearch(
    documentId: string,
    fileName: string,
    text: string,
    userId?: string,
    openaiKey?: string
  ): Promise<{ success: boolean; chunks: DocumentChunk[]; error?: string }> {
    try {
      console.log(`Processing document ${documentId} for semantic search`)

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text)
      console.log(`Created ${chunks.length} chunks for document ${documentId}`)

      // Generate embeddings for each chunk if OpenAI key is provided
      let chunksWithEmbeddings: DocumentChunk[] = []
      
      // Always use hardcoded API key for native intelligence
      const finalOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;
      if (!finalOpenaiKey) {
        throw new Error('OpenAI API key not configured in environment variables.');
      }
      chunksWithEmbeddings = await this.generateEmbeddingsForChunks(chunks, finalOpenaiKey)

      // Save chunks to database
      const savedChunks = await this.saveChunksToDatabase(chunksWithEmbeddings)
      
      if (savedChunks.length === 0) {
        throw new Error('Failed to save chunks to database')
      }

      console.log(`Successfully processed ${savedChunks.length} chunks for document ${documentId}`)
      
      return {
        success: true,
        chunks: savedChunks
      }

    } catch (error) {
      console.error('Error processing document for search:', error)
      return {
        success: false,
        chunks: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Split text into overlapping chunks for better search results
   */
  private static splitTextIntoChunks(text: string): string[] {
    if (text.length <= this.CHUNK_SIZE) {
      return [text]
    }

    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + this.CHUNK_SIZE, text.length)
      
      // Try to break at a sentence boundary
      let chunkEnd = end
      if (end < text.length) {
        const nextPeriod = text.indexOf('.', end - 100)
        const nextNewline = text.indexOf('\n', end - 100)
        
        if (nextPeriod > end - 100 && nextPeriod < end + 100) {
          chunkEnd = nextPeriod + 1
        } else if (nextNewline > end - 100 && nextNewline < end + 100) {
          chunkEnd = nextNewline + 1
        }
      }

      const chunk = text.slice(start, chunkEnd).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }

      // Move start position with overlap - FIXED: ensure we always move forward
      start = Math.max(start + 1, chunkEnd - this.CHUNK_OVERLAP)
      
      // Safety check to prevent infinite loops
      if (start >= text.length) {
        break
      }
    }

    return chunks
  }

  /**
   * Generate embeddings for text chunks using OpenAI with improved rate limiting
   */
  private static async generateEmbeddingsForChunks(
    chunks: string[],
    openaiKey: string
  ): Promise<DocumentChunk[]> {
    const chunksWithEmbeddings: DocumentChunk[] = []
    const maxConcurrent = 3 // Process max 3 chunks at a time
    const delayBetweenBatches = 2000 // 2 second delay between batches

    // Process chunks in batches to avoid overwhelming the API
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const batch = chunks.slice(i, i + maxConcurrent)
      console.log(`Processing embedding batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(chunks.length / maxConcurrent)} (${batch.length} chunks)`)

      // Process batch concurrently
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex
        try {
          console.log(`Generating embedding for chunk ${globalIndex + 1}/${chunks.length}`)
          const embedding = await AIService.generateEmbeddings(chunk, openaiKey)
          
          return {
            id: `chunk_${globalIndex}_${Date.now()}`,
            documentId: '', // Will be set by caller
            fileName: '', // Will be set by caller
            chunkText: chunk,
            chunkIndex: globalIndex,
            chunkSize: chunk.length,
            embedding,
            metadata: {
              processingMethod: 'openai-embedding',
              embeddingModel: 'text-embedding-ada-002',
              embeddingDimension: embedding.length
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${globalIndex + 1}:`, error)
          // Return chunk without embedding as fallback
          return {
            id: `chunk_${globalIndex}_${Date.now()}`,
            documentId: '',
            fileName: '',
            chunkText: chunk,
            chunkIndex: globalIndex,
            chunkSize: chunk.length,
            embedding: undefined,
            metadata: {
              processingMethod: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      chunksWithEmbeddings.push(...batchResults)

      // Add delay between batches (except for the last batch)
      if (i + maxConcurrent < chunks.length) {
        console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    console.log(`✅ Completed embedding generation: ${chunksWithEmbeddings.length} chunks processed`)
    return chunksWithEmbeddings
  }

  /**
   * Save chunks to the database
   */
  private static async saveChunksToDatabase(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (!supabaseAdmin) {
      console.log('Supabase not configured, using guest mode with localStorage')
      return this.saveChunksToGuestStorage(chunks)
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('document_chunks')
        .insert(chunks.map(chunk => ({
          document_id: chunk.documentId,
          file_name: chunk.fileName,
          chunk_text: chunk.chunkText,
          chunk_index: chunk.chunkIndex,
          chunk_size: chunk.chunkSize,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
          user_id: chunk.userId
        })))
        .select()

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error saving chunks to database:', error)
      // Fallback to guest storage
      console.warn('Falling back to guest storage due to database error')
      return this.saveChunksToGuestStorage(chunks)
    }
  }

  /**
   * Save chunks to guest storage (localStorage)
   */
  private static saveChunksToGuestStorage(chunks: DocumentChunk[]): DocumentChunk[] {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window not available')
      }

      // Get existing chunks from localStorage
      const existingChunks = JSON.parse(localStorage.getItem(this.GUEST_STORAGE_KEY) || '[]')
      
      // Add new chunks with proper IDs
      const chunksWithIds = chunks.map((chunk, index) => ({
        ...chunk,
        id: `guest_chunk_${Date.now()}_${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      // Combine and save
      const allChunks = [...existingChunks, ...chunksWithIds]
      localStorage.setItem(this.GUEST_STORAGE_KEY, JSON.stringify(allChunks))
      
      console.log(`Saved ${chunksWithIds.length} chunks to guest storage. Total chunks: ${allChunks.length}`)
      return chunksWithIds

    } catch (error) {
      console.error('Error saving to guest storage:', error)
      // Return chunks with basic IDs as fallback
      return chunks.map((chunk, index) => ({
        ...chunk,
        id: `fallback_chunk_${index}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }
  }

  /**
   * Search documents using semantic similarity
   */
  static async searchDocuments(
    query: string,
    userId?: string,
    limit: number = 10,
    threshold: number = 0.1
  ): Promise<{ success: boolean; results: SearchResult[]; error?: string }> {
    try {
      if (!supabaseAdmin) {
        console.log('Supabase not configured, using guest mode search')
        return this.searchDocumentsInGuestMode(query, limit, threshold)
      }

      // Generate query embedding using hardcoded API key for native intelligence
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured in environment variables.');
      }

      const queryEmbedding = await AIService.generateEmbeddings(query, openaiKey)

      // Search using the database function
      const { data: results, error } = await supabaseAdmin.rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        user_id_filter: userId || null
      })

      if (error) {
        throw error
      }

      // Transform results to match our interface
      const transformedResults: SearchResult[] = (results || []).map((result: any) => ({
        id: result.id,
        documentId: result.document_id,
        fileName: result.file_name,
        chunkText: result.chunk_text,
        chunkIndex: result.chunk_index,
        chunkSize: result.chunk_size,
        similarity: result.similarity,
        metadata: result.metadata || {}
      }))

      return {
        success: true,
        results: transformedResults
      }

    } catch (error) {
      console.error('Error searching documents:', error)
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Search documents in guest mode using localStorage
   */
  private static async searchDocumentsInGuestMode(
    query: string,
    limit: number = 10,
    threshold: number = 0.1
  ): Promise<{ success: boolean; results: SearchResult[]; error?: string }> {
    try {
      if (typeof window === 'undefined') {
        return {
          success: false,
          results: [],
          error: 'Guest mode not available in server environment'
        }
      }

      // Get chunks from localStorage
      const storedChunks = JSON.parse(localStorage.getItem(this.GUEST_STORAGE_KEY) || '[]')
      
      if (storedChunks.length === 0) {
        return {
          success: true,
          results: [],
          error: 'No documents found in guest storage. Upload some documents first to enable search.'
        }
      }

      // Simple text-based search for guest mode (no embeddings)
      const queryLower = query.toLowerCase()
      const results: SearchResult[] = []

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
        
        if (relevanceScore >= threshold) {
          results.push({
            id: chunk.id,
            documentId: chunk.documentId || chunk.document_id,
            fileName: chunk.fileName || chunk.file_name,
            chunkText: chunkText,
            chunkIndex: chunk.chunkIndex || chunk.chunk_index || 0,
            chunkSize: chunk.chunkSize || chunk.chunk_size || chunkText.length,
            similarity: relevanceScore,
            metadata: chunk.metadata || {}
          })
        }
      }

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      console.log(`Guest mode search found ${sortedResults.length} results for query: "${query}"`)
      
      return {
        success: true,
        results: sortedResults
      }

    } catch (error) {
      console.error('Error in guest mode search:', error)
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Guest mode search failed'
      }
    }
  }

  /**
   * Get RAG statistics for a user
   */
  static async getStats(userId?: string): Promise<{ success: boolean; stats?: RAGStats; error?: string }> {
    try {
      if (!supabaseAdmin) {
        console.log('Supabase not configured, getting guest mode stats')
        return this.getGuestModeStats()
      }

      const { data, error } = await supabaseAdmin.rpc('get_document_stats', {
        user_id_filter: userId || null
      })

      if (error) {
        throw error
      }

      const stats = data?.[0]
      if (!stats) {
        return {
          success: true,
          stats: {
            totalDocuments: 0,
            totalChunks: 0,
            totalEmbeddings: 0,
            avgChunkSize: 0,
            oldestDocument: new Date().toISOString(),
            newestDocument: new Date().toISOString()
          }
        }
      }

      return {
        success: true,
        stats: {
          totalDocuments: Number(stats.total_documents) || 0,
          totalChunks: Number(stats.total_chunks) || 0,
          totalEmbeddings: Number(stats.total_embeddings) || 0,
          avgChunkSize: Number(stats.avg_chunk_size) || 0,
          oldestDocument: stats.oldest_document || new Date().toISOString(),
          newestDocument: stats.newest_document || new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Error getting RAG stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get RAG statistics for guest mode
   */
  private static getGuestModeStats(): { success: boolean; stats?: RAGStats; error?: string } {
    try {
      if (typeof window === 'undefined') {
        return {
          success: false,
          error: 'Guest mode not available in server environment'
        }
      }

      const storedChunks = JSON.parse(localStorage.getItem(this.GUEST_STORAGE_KEY) || '[]')
      
      if (storedChunks.length === 0) {
        return {
          success: true,
          stats: {
            totalDocuments: 0,
            totalChunks: 0,
            totalEmbeddings: 0,
            avgChunkSize: 0,
            oldestDocument: new Date().toISOString(),
            newestDocument: new Date().toISOString()
          }
        }
      }

      // Calculate stats from localStorage
      const uniqueDocuments = new Set(storedChunks.map((chunk: any) => 
        chunk.documentId || chunk.document_id
      )).size

      const totalChunks = storedChunks.length
      const totalEmbeddings = 0 // No embeddings in guest mode
      const avgChunkSize = storedChunks.reduce((sum: number, chunk: any) => {
        const text = chunk.chunkText || chunk.chunk_text || ''
        return sum + text.length
      }, 0) / totalChunks

      const dates = storedChunks.map((chunk: any) => 
        new Date(chunk.createdAt || chunk.created_at || Date.now())
      ).sort((a: Date, b: Date) => a.getTime() - b.getTime())

      return {
        success: true,
        stats: {
          totalDocuments: uniqueDocuments,
          totalChunks,
          totalEmbeddings,
          avgChunkSize: Math.round(avgChunkSize),
          oldestDocument: dates[0]?.toISOString() || new Date().toISOString(),
          newestDocument: dates[dates.length - 1]?.toISOString() || new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Error getting guest mode stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get guest mode stats'
      }
    }
  }

  /**
   * Delete all chunks for a specific document
   */
  static async deleteDocumentChunks(documentId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        console.log('Supabase not configured, using guest mode delete')
        return this.deleteDocumentChunksFromGuestStorage(documentId)
      }

      const { error } = await supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      return { success: true }

    } catch (error) {
      console.error('Error deleting document chunks:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete document chunks from guest storage
   */
  private static deleteDocumentChunksFromGuestStorage(documentId: string): { success: boolean; error?: string } {
    try {
      if (typeof window === 'undefined') {
        return {
          success: false,
          error: 'Guest mode not available in server environment'
        }
      }

      const storedChunks = JSON.parse(localStorage.getItem(this.GUEST_STORAGE_KEY) || '[]')
      const filteredChunks = storedChunks.filter((chunk: any) => 
        (chunk.documentId || chunk.document_id) !== documentId
      )

      localStorage.setItem(this.GUEST_STORAGE_KEY, JSON.stringify(filteredChunks))
      
      const deletedCount = storedChunks.length - filteredChunks.length
      console.log(`Deleted ${deletedCount} chunks for document ${documentId} from guest storage`)
      
      return { success: true }

    } catch (error) {
      console.error('Error deleting from guest storage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete from guest storage'
      }
    }
  }
}
