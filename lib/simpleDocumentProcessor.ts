import { createClient } from '@supabase/supabase-js'
import { TextractClient } from '@aws-sdk/client-textract'
import * as mammoth from 'mammoth'

export interface SimpleDocumentResult {
  success: boolean
  text: string
  wordCount: number
  pages: number
  error?: string
  processingTime: number
}

export class SimpleDocumentProcessor {
  private static readonly CHUNK_SIZE = 1000
  
  /**
   * Process PDF documents with basic text extraction
   */
  static async processPDF(buffer: Buffer, fileName: string): Promise<SimpleDocumentResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Processing PDF: ${fileName}`)
      
      // Try pdf-parse first (simple approach)
      try {
        const pdfParse = await import('pdf-parse')
        const pdfData = await pdfParse.default(buffer)
        const text = pdfData.text || ''
        const pages = pdfData.numpages || 1
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
        
        return {
          success: true,
          text,
          wordCount,
          pages,
          processingTime: Date.now() - startTime
        }
      } catch (pdfParseError) {
        console.warn('PDF-parse failed, trying fallback:', pdfParseError)
        
        // Fallback: return empty result for unsupported PDFs
        return {
          success: false,
          text: '',
          wordCount: 0,
          pages: 1,
          error: 'PDF text extraction not supported for this document type',
          processingTime: Date.now() - startTime
        }
      }
      
    } catch (error) {
      console.error('PDF processing failed:', error)
      return {
        success: false,
        text: '',
        wordCount: 0,
        pages: 1,
        error: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: Date.now() - startTime
      }
    }
  }
  
  /**
   * Process DOCX documents
   */
  static async processDOCX(buffer: Buffer, fileName: string): Promise<SimpleDocumentResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Processing DOCX: ${fileName}`)
      
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value || ''
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      if (result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages)
      }
      
      return {
        success: true,
        text,
        wordCount,
        pages: Math.ceil(wordCount / 250), // Estimate pages
        processingTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('DOCX processing failed:', error)
      return {
        success: false,
        text: '',
        wordCount: 0,
        pages: 1,
        error: `DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: Date.now() - startTime
      }
    }
  }
  
  /**
   * Process TXT documents
   */
  static async processTXT(buffer: Buffer, fileName: string): Promise<SimpleDocumentResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Processing TXT: ${fileName}`)
      
      const text = buffer.toString('utf-8')
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        success: true,
        text,
        wordCount,
        pages: Math.ceil(wordCount / 250), // Estimate pages
        processingTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('TXT processing failed:', error)
      return {
        success: false,
        text: '',
        wordCount: 0,
        pages: 1,
        error: `TXT processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: Date.now() - startTime
      }
    }
  }
  
  /**
   * Main processing function that routes to appropriate processor
   */
  static async processDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<SimpleDocumentResult> {
    try {
      console.log(`SimpleDocumentProcessor: Processing ${fileName} (${mimeType})`)
      
      // Determine file type and process accordingly
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await this.processPDF(buffer, fileName)
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileName.toLowerCase().endsWith('.docx')) {
        return await this.processDOCX(buffer, fileName)
      } else if (mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')) {
        return await this.processTXT(buffer, fileName)
      } else {
        return {
          success: false,
          text: '',
          wordCount: 0,
          pages: 1,
          error: `Unsupported file type: ${mimeType}. Only PDF, DOCX, and TXT files are supported.`,
          processingTime: 0
        }
      }
    } catch (error) {
      console.error(`SimpleDocumentProcessor error for ${fileName}:`, error)
      return {
        success: false,
        text: '',
        wordCount: 0,
        pages: 1,
        error: `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: 0
      }
    }
  }
  
  /**
   * Split text into chunks for RAG processing
   */
  static chunkText(text: string, chunkSize: number = this.CHUNK_SIZE): string[] {
    if (!text || text.length === 0) return []
    
    const chunks: string[] = []
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if (!trimmedSentence) continue
      
      if (currentChunk.length + trimmedSentence.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence + '.'
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }
        currentChunk = trimmedSentence + '.'
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }
}
