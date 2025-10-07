// Database service for persistent storage
// Replaces global.uploadedFiles with PostgreSQL

import { Pool, PoolClient } from 'pg'

interface FileData {
  id: string
  userId: string
  name: string
  type: string
  size: number
  buffer: string
  extractedText?: string
  summary?: string
  transcription?: string
  processingMethod?: string
  metadata?: any
  uploadedAt: string
  updatedAt: string
}

interface DocumentRecord {
  id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  file_path?: string
  extracted_text?: string
  summary?: string
  transcription?: string
  processing_method?: string
  processing_status: string
  metadata?: any
  created_at: string
  updated_at: string
}

class DatabaseService {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client:', err)
    })
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      console.log('✅ Database connection successful')
      return true
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      return false
    }
  }

  // File storage methods (replaces global.uploadedFiles)
  async storeFile(fileData: FileData): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `INSERT INTO file_uploads (
          id, user_id, original_name, temp_file_path, 
          upload_status, file_size, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          fileData.id,
          fileData.userId,
          fileData.name,
          fileData.buffer, // Store base64 in temp_file_path for now
          'uploaded',
          fileData.size,
          fileData.uploadedAt
        ]
      )
      console.log(`✅ File stored in database: ${fileData.name}`)
    } catch (error) {
      console.error('❌ Error storing file:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getFile(fileId: string): Promise<FileData | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT 
          id, user_id, original_name, temp_file_path, 
          upload_status, file_size, uploaded_at
        FROM file_uploads 
        WHERE id = $1`,
        [fileId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        name: row.original_name,
        type: 'unknown', // We'll need to determine this
        size: row.file_size,
        buffer: row.temp_file_path || '',
        uploadedAt: row.uploaded_at,
        updatedAt: row.uploaded_at
      }
    } catch (error) {
      console.error('❌ Error getting file:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async updateFileProcessing(fileId: string, updates: Partial<FileData>): Promise<void> {
    const client = await this.pool.connect()
    try {
      // Update file_uploads table
      await client.query(
        `UPDATE file_uploads 
         SET upload_status = $1, processed_at = $2 
         WHERE id = $3`,
        ['processed', new Date().toISOString(), fileId]
      )

      // Insert into documents table
      const fileData = await this.getFile(fileId)
      if (!fileData) {
        throw new Error('File not found')
      }

      await client.query(
        `INSERT INTO documents (
          id, user_id, file_name, file_type, file_size,
          extracted_text, summary, transcription, processing_method,
          processing_status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          fileId,
          fileData.userId,
          fileData.name,
          fileData.type,
          fileData.size,
          updates.extractedText,
          updates.summary,
          updates.transcription,
          updates.processingMethod || 'ai',
          'completed',
          JSON.stringify(updates.metadata || {}),
          fileData.uploadedAt,
          new Date().toISOString()
        ]
      )

      console.log(`✅ File processing updated: ${fileId}`)
    } catch (error) {
      console.error('❌ Error updating file processing:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('DELETE FROM file_uploads WHERE id = $1', [fileId])
      await client.query('DELETE FROM documents WHERE id = $1', [fileId])
      console.log(`✅ File deleted: ${fileId}`)
    } catch (error) {
      console.error('❌ Error deleting file:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Document methods
  async getDocument(fileId: string): Promise<DocumentRecord | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM documents WHERE id = $1`,
        [fileId]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('❌ Error getting document:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getUserDocuments(userId: string, limit: number = 50): Promise<DocumentRecord[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM documents 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      )
      return result.rows
    } catch (error) {
      console.error('❌ Error getting user documents:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // AI Analysis methods
  async storeAnalysis(
    documentId: string,
    analysisType: string,
    inputText: string,
    outputText: string,
    confidence?: number,
    modelUsed?: string,
    metadata?: any
  ): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `INSERT INTO ai_analysis (
          document_id, analysis_type, input_text, output_text,
          confidence_score, model_used, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          documentId,
          analysisType,
          inputText,
          outputText,
          confidence,
          modelUsed || 'gpt-4',
          JSON.stringify(metadata || {})
        ]
      )
      console.log(`✅ AI analysis stored for document: ${documentId}`)
    } catch (error) {
      console.error('❌ Error storing AI analysis:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getAnalysisHistory(documentId: string): Promise<any[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM ai_analysis 
         WHERE document_id = $1 
         ORDER BY created_at DESC`,
        [documentId]
      )
      return result.rows
    } catch (error) {
      console.error('❌ Error getting analysis history:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Chat methods
  async createConversation(userId: string, documentId?: string, title?: string): Promise<string> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO conversations (user_id, document_id, title)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, documentId, title || 'New Conversation']
      )
      return result.rows[0].id
    } catch (error) {
      console.error('❌ Error creating conversation:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async addMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `INSERT INTO messages (conversation_id, role, content, metadata)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, role, content, JSON.stringify(metadata || {})]
      )
    } catch (error) {
      console.error('❌ Error adding message:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC`,
        [conversationId]
      )
      return result.rows
    } catch (error) {
      console.error('❌ Error getting conversation messages:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Cleanup methods
  async cleanupOldFiles(olderThanHours: number = 24): Promise<number> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `DELETE FROM file_uploads 
         WHERE uploaded_at < NOW() - INTERVAL '${olderThanHours} hours'
         AND upload_status = 'uploading'`
      )
      console.log(`🧹 Cleaned up ${result.rowCount} old files`)
      return result.rowCount || 0
    } catch (error) {
      console.error('❌ Error cleaning up old files:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getStats(userId: string): Promise<any> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM get_document_stats($1)`,
        [userId]
      )
      return result.rows[0]
    } catch (error) {
      console.error('❌ Error getting stats:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Graceful shutdown
  async close(): Promise<void> {
    await this.pool.end()
    console.log('✅ Database connection pool closed')
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default databaseService
