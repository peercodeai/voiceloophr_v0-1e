import { promises as fs } from 'fs'
import * as path from 'path'
import * as mammoth from 'mammoth'
import * as csv from 'csv-parser'

export interface DocumentMetadata {
  title: string
  author: string
  creationDate: Date
  modificationDate: Date
  pageCount: number
  wordCount: number
  language: string
}

export interface DocumentContent {
  text: string
  metadata: DocumentMetadata
  confidence: number
  processingMethod: string
}

export interface ProcessingResult {
  success: boolean
  content?: DocumentContent
  error?: string
  processingTime: number
}

export class DocumentProcessor {
  private static readonly SUPPORTED_DOCUMENT_TYPES = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown', 'text/csv'
  ]

  /**
   * Check if file type is supported for document processing
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    const hasSupportedMimeType = this.SUPPORTED_DOCUMENT_TYPES.includes(mimeType)
    const hasSupportedExtension = fileName.match(/\.(pdf|doc|docx|txt|md|csv)$/i)
    
    return hasSupportedMimeType || !!hasSupportedExtension
  }

  /**
   * Process text files directly
   */
  static async processTextFile(filePath: string): Promise<DocumentContent> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)
      
      const metadata: DocumentMetadata = {
        title: path.basename(filePath, path.extname(filePath)),
        author: 'Unknown',
        creationDate: stats.birthtime,
        modificationDate: stats.mtime,
        pageCount: 1,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        language: 'en'
      }
      
      return {
        text: content,
        metadata,
        confidence: 1.0,
        processingMethod: 'direct'
      }
    } catch (error) {
      throw new Error(`Text file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process Markdown files
   */
  static async processMarkdownFile(filePath: string): Promise<DocumentContent> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)
      
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : path.basename(filePath, path.extname(filePath))
      
      const metadata: DocumentMetadata = {
        title,
        author: 'Unknown',
        creationDate: stats.birthtime,
        modificationDate: stats.mtime,
        pageCount: 1,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        language: 'en'
      }
      
      return {
        text: content,
        metadata,
        confidence: 1.0,
        processingMethod: 'markdown'
      }
    } catch (error) {
      throw new Error(`Markdown file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process CSV files
   */
  static async processCSVFile(filePath: string): Promise<DocumentContent> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)
      
      // Parse CSV to get structure
      const rows: string[][] = []
      const lines = content.split('\n')
      
      lines.forEach(line => {
        if (line.trim()) {
          rows.push(line.split(',').map(cell => cell.trim()))
        }
      })
      
      const metadata: DocumentMetadata = {
        title: path.basename(filePath, path.extname(filePath)),
        author: 'Unknown',
        creationDate: stats.birthtime,
        modificationDate: stats.mtime,
        pageCount: 1,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        language: 'en'
      }
      
      return {
        text: content,
        metadata,
        confidence: 1.0,
        processingMethod: 'csv'
      }
    } catch (error) {
      throw new Error(`CSV file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process Word documents using mammoth
   */
  static async processWordDocument(filePath: string): Promise<DocumentContent> {
    try {
      const buffer = await fs.readFile(filePath)
      const result = await mammoth.extractRawText({ buffer })
      
      const stats = await fs.stat(filePath)
      const metadata: DocumentMetadata = {
        title: path.basename(filePath, path.extname(filePath)),
        author: 'Unknown',
        creationDate: stats.birthtime,
        modificationDate: stats.mtime,
        pageCount: 1,
        wordCount: result.value.split(/\s+/).filter(word => word.length > 0).length,
        language: 'en'
      }
      
      return {
        text: result.value,
        metadata,
        confidence: 0.95,
        processingMethod: 'mammoth'
      }
    } catch (error) {
      throw new Error(`Word document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process document based on file type
   */
  static async processDocument(filePath: string): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      const ext = path.extname(filePath).toLowerCase()
      let content: DocumentContent
      
      switch (ext) {
        case '.txt':
          content = await this.processTextFile(filePath)
          break
        case '.md':
          content = await this.processMarkdownFile(filePath)
          break
        case '.csv':
          content = await this.processCSVFile(filePath)
          break
        case '.doc':
        case '.docx':
          content = await this.processWordDocument(filePath)
          break
        default:
          throw new Error(`Unsupported document type: ${ext}`)
      }
      
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        content,
        processingTime
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      }
    }
  }

  /**
   * Get supported document types
   */
  static getSupportedTypes(): string[] {
    return [...this.SUPPORTED_DOCUMENT_TYPES]
  }

  /**
   * Validate document file
   */
  static async validateDocumentFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath)
      return stats.isFile() && stats.size > 0
    } catch {
      return false
    }
  }
}
