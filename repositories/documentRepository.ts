import { ProcessedDocument, DatabaseDocument, DatabaseEmbedding } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'

export class DocumentRepository {
  async create(documentData: Omit<ProcessedDocument, 'id'>): Promise<ProcessedDocument> {
    if (!supabaseAdmin) {
      throw new Error('Database not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: documentData.userId,
        file_name: documentData.fileName,
        content: documentData.content,
        uploaded_at: documentData.uploadedAt
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      ...documentData,
      id: data.id
    }
  }

  async findById(id: string): Promise<ProcessedDocument | null> {
    if (!supabaseAdmin) {
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Document not found
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return this.mapDatabaseDocumentToProcessedDocument(data)
  }

  async findByUserId(
    userId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<{ documents: ProcessedDocument[], totalCount: number }> {
    if (!supabaseAdmin) {
      return { documents: [], totalCount: 0 }
    }

    const offset = (page - 1) * pageSize

    const { data, error, count } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const documents = (data || []).map(doc => this.mapDatabaseDocumentToProcessedDocument(doc))

    return {
      documents,
      totalCount: count || 0
    }
  }

  async update(id: string, updates: Partial<ProcessedDocument>): Promise<ProcessedDocument> {
    if (!supabaseAdmin) {
      throw new Error('Database not configured')
    }

    const updateData: any = {}
    
    if (updates.fileName) updateData.file_name = updates.fileName
    if (updates.content) updateData.content = updates.content
    if (updates.userId) updateData.user_id = updates.userId

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return this.mapDatabaseDocumentToProcessedDocument(data)
  }

  async delete(id: string): Promise<boolean> {
    if (!supabaseAdmin) {
      return false
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return true
  }

  async deleteByUserId(userId: string): Promise<number> {
    if (!supabaseAdmin) {
      return 0
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('user_id', userId)
      .select('id')

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data?.length || 0
  }

  async searchByContent(
    query: string, 
    userId: string, 
    limit: number = 10
  ): Promise<ProcessedDocument[]> {
    if (!supabaseAdmin) {
      return []
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .textSearch('content', query)
      .limit(limit)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return (data || []).map(doc => this.mapDatabaseDocumentToProcessedDocument(doc))
  }

  async createEmbedding(documentId: string, embedding: number[]): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Database not configured')
    }

    const { error } = await supabaseAdmin
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        embedding
      })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
  }

  async getEmbedding(documentId: string): Promise<number[] | null> {
    if (!supabaseAdmin) {
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('document_embeddings')
      .select('embedding')
      .eq('document_id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Embedding not found
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return data.embedding
  }

  async deleteEmbedding(documentId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      return false
    }

    const { error } = await supabaseAdmin
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return true
  }

  async getStats(userId?: string): Promise<{
    totalDocuments: number
    totalSize: number
    averageWordCount: number
    documentsByType: Record<string, number>
  }> {
    if (!supabaseAdmin) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        averageWordCount: 0,
        documentsByType: {}
      }
    }

    let query = supabaseAdmin
      .from('documents')
      .select('file_name, content')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const documents = data || []
    const totalDocuments = documents.length
    let totalSize = 0
    let totalWordCount = 0
    const documentsByType: Record<string, number> = {}

    documents.forEach(doc => {
      const content = doc.content || ''
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
      const size = Buffer.byteLength(content, 'utf8')
      
      totalSize += size
      totalWordCount += wordCount

      const extension = doc.file_name.split('.').pop()?.toLowerCase() || 'unknown'
      documentsByType[extension] = (documentsByType[extension] || 0) + 1
    })

    return {
      totalDocuments,
      totalSize,
      averageWordCount: totalDocuments > 0 ? Math.round(totalWordCount / totalDocuments) : 0,
      documentsByType
    }
  }

  private mapDatabaseDocumentToProcessedDocument(dbDoc: DatabaseDocument): ProcessedDocument {
    const wordCount = dbDoc.content.split(/\s+/).filter(word => word.length > 0).length
    const pages = Math.ceil(wordCount / 250)

    return {
      id: dbDoc.id,
      userId: dbDoc.user_id,
      fileName: dbDoc.file_name,
      content: dbDoc.content,
      wordCount,
      pages,
      metadata: {
        pageCount: pages,
        wordCount,
        fileSize: Buffer.byteLength(dbDoc.content, 'utf8'),
        processingVersion: '2.0.0',
        processingMethod: 'direct',
        confidence: 1.0
      },
      uploadedAt: dbDoc.uploaded_at,
      processed: true,
      processingError: null
    }
  }
}

export const documentRepository = new DocumentRepository()
