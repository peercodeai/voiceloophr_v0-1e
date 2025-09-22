import { ProcessedDocument, DocumentMetadata, DocumentAnalysis, GlobalFileData } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'
import { getFileFromGlobalStorage, setFileInGlobalStorage } from '@/lib/global-storage'
import { AIService } from '@/lib/aiService'
import { getUserContext } from '@/lib/auth'

export class DocumentService {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  async processAndSaveDocument(
    fileContent: string, 
    fileName: string, 
    userId: string,
    fileType: string = 'text/plain'
  ): Promise<ProcessedDocument> {
    const userContext = getUserContext(userId)
    
    // Process document content
    const wordCount = fileContent.split(/\s+/).filter(word => word.length > 0).length
    const pages = Math.ceil(wordCount / 250) // Estimate pages based on word count
    
    // Generate analysis if AI service is available
    let analysis: DocumentAnalysis | undefined
    try {
      const aiAnalysis = await this.aiService.analyzeText(fileContent, fileName, fileType)
      analysis = {
        summary: aiAnalysis.summary || 'No summary available',
        keywords: aiAnalysis.keywords || [],
        sentimentScore: aiAnalysis.sentimentScore,
        topics: aiAnalysis.topics || [],
        entities: aiAnalysis.entities || [],
        language: aiAnalysis.language || 'en',
        readingTime: Math.ceil(wordCount / 200), // Estimate reading time
        complexity: this.calculateComplexity(wordCount, aiAnalysis.keywords?.length || 0)
      }
    } catch (error) {
      console.warn('AI analysis failed:', error)
      // Continue without analysis
    }

    const metadata: DocumentMetadata = {
      pageCount: pages,
      wordCount,
      fileSize: Buffer.byteLength(fileContent, 'utf8'),
      processingVersion: '2.0.0',
      processingMethod: 'direct',
      confidence: 1.0,
      note: 'Document processed successfully'
    }

    const processedDocument: ProcessedDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userContext.userId,
      fileName,
      content: fileContent,
      wordCount,
      pages,
      metadata,
      analysis,
      processingTime: Date.now(),
      uploadedAt: new Date().toISOString(),
      processed: true,
      processingError: null
    }

    // Save to database only for authenticated users
    if (userContext.shouldSaveToDatabase && supabaseAdmin) {
      try {
        const { data: document, error: docError } = await supabaseAdmin
          .from('documents')
          .insert({
            user_id: processedDocument.userId,
            file_name: processedDocument.fileName,
            content: processedDocument.content,
            uploaded_at: processedDocument.uploadedAt
          })
          .select()
          .single()

        if (docError) {
          throw new Error(`Database error: ${docError.message}`)
        }

        processedDocument.id = document.id

        // Generate and store embeddings if analysis is available
        if (analysis && process.env.OPENAI_API_KEY) {
          await this.generateAndStoreEmbeddings(processedDocument.id, fileContent)
        }
      } catch (error) {
        console.error('Failed to save document to database:', error)
        processedDocument.processingError = error instanceof Error ? error.message : 'Database save failed'
      }
    }

    return processedDocument
  }

  async getDocumentsForUser(
    userId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<{ documents: ProcessedDocument[], totalCount: number, totalPages: number }> {
    const userContext = getUserContext(userId)
    
    if (!userContext.shouldSaveToDatabase || !supabaseAdmin) {
      return { documents: [], totalCount: 0, totalPages: 0 }
    }

    try {
      const offset = (page - 1) * pageSize
      
      const { data: documents, error, count } = await supabaseAdmin
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const processedDocuments: ProcessedDocument[] = (documents || []).map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        fileName: doc.file_name,
        content: doc.content,
        wordCount: doc.content.split(/\s+/).filter(word => word.length > 0).length,
        pages: Math.ceil(doc.content.split(/\s+/).length / 250),
        metadata: {
          pageCount: Math.ceil(doc.content.split(/\s+/).length / 250),
          wordCount: doc.content.split(/\s+/).filter(word => word.length > 0).length,
          fileSize: Buffer.byteLength(doc.content, 'utf8'),
          processingVersion: '2.0.0',
          processingMethod: 'direct',
          confidence: 1.0
        },
        uploadedAt: doc.uploaded_at,
        processed: true,
        processingError: null
      }))

      const totalPages = Math.ceil((count || 0) / pageSize)

      return {
        documents: processedDocuments,
        totalCount: count || 0,
        totalPages
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      throw error
    }
  }

  async searchDocuments(
    query: string, 
    userId: string, 
    limit: number = 10, 
    threshold: number = 0.7
  ): Promise<ProcessedDocument[]> {
    const userContext = getUserContext(userId)
    
    if (!userContext.shouldSaveToDatabase || !supabaseAdmin) {
      return []
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.aiService.generateEmbeddings(query)
      
      // Search using the database function
      const { data: results, error } = await supabaseAdmin.rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        user_id: userId
      })

      if (error) {
        throw new Error(`Search error: ${error.message}`)
      }

      return (results || []).map((result: any) => ({
        id: result.id,
        userId: result.user_id,
        fileName: result.file_name,
        content: result.content,
        wordCount: result.content.split(/\s+/).filter((word: string) => word.length > 0).length,
        pages: Math.ceil(result.content.split(/\s+/).length / 250),
        metadata: {
          pageCount: Math.ceil(result.content.split(/\s+/).length / 250),
          wordCount: result.content.split(/\s+/).filter((word: string) => word.length > 0).length,
          fileSize: Buffer.byteLength(result.content, 'utf8'),
          processingVersion: '2.0.0',
          processingMethod: 'direct',
          confidence: result.similarity || 0
        },
        uploadedAt: result.uploaded_at,
        processed: true,
        processingError: null
      }))
    } catch (error) {
      console.error('Failed to search documents:', error)
      throw error
    }
  }

  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const userContext = getUserContext(userId)
    
    if (!userContext.shouldSaveToDatabase || !supabaseAdmin) {
      return false
    }

    try {
      const { error } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Delete error: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  }

  private calculateComplexity(wordCount: number, keywordCount: number): 'low' | 'medium' | 'high' {
    const complexityScore = (wordCount / 1000) + (keywordCount / 10)
    
    if (complexityScore < 2) return 'low'
    if (complexityScore < 5) return 'medium'
    return 'high'
  }

  private async generateAndStoreEmbeddings(documentId: string, content: string): Promise<void> {
    if (!supabaseAdmin) return

    try {
      const embedding = await this.aiService.generateEmbeddings(content)
      
      const { error } = await supabaseAdmin
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          embedding
        })

      if (error) {
        console.error('Failed to store embedding:', error)
      }
    } catch (error) {
      console.error('Failed to generate embedding:', error)
    }
  }
}

export const documentService = new DocumentService()
