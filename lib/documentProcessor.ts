import mammoth from 'mammoth'
import csv from 'csv-parser'
import { Readable } from 'stream'
import { SmartParser, SmartParserResult } from './smartParser'

export interface ProcessedDocument {
  text: string
  wordCount: number
  pages?: number
  metadata?: Record<string, any>
  // Enhanced fields from Smart Parser
  contentAnalysis?: any
  securityScan?: any
  processingTime?: number
  capabilities?: string[]
  hasErrors?: boolean
  errors?: string[]
  warnings?: string[]
}

export class DocumentProcessor {
  /**
   * Process PDF documents and extract text content using Smart Parser
   */
  static async processPDF(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      console.log(`Processing PDF with Smart Parser - buffer size: ${buffer.length} bytes`)
      
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        throw new Error("Invalid buffer: empty or null")
      }
      
      // Use Smart Parser for enhanced PDF processing
      const smartResult = await SmartParser.parseDocument(
        buffer,
        'document.pdf',
        'application/pdf',
        {
          enableContentAnalysis: true,
          enableSecurityScan: true,
          enableOCR: true
        }
      )
      
      console.log(`Smart Parser completed: ${smartResult.text.length} characters extracted`)
      
      return {
        text: smartResult.text,
        wordCount: smartResult.wordCount,
        pages: smartResult.pages,
        metadata: {
          title: 'PDF Document (Enhanced Processing)',
          author: 'Smart Parser',
          subject: 'PDF processed with enhanced capabilities',
          creator: 'VoiceLoop HR Smart Parser',
          producer: 'Enhanced PDF Processor v2.0',
          creationDate: new Date().toISOString(),
          modificationDate: new Date().toISOString(),
          processingVersion: smartResult.processingVersion,
          capabilities: smartResult.capabilities,
          processingTime: smartResult.processingTime
        },
        // Enhanced fields from Smart Parser
        contentAnalysis: smartResult.contentAnalysis,
        securityScan: smartResult.securityScan,
        processingTime: smartResult.processingTime,
        capabilities: smartResult.capabilities,
        hasErrors: smartResult.hasErrors,
        errors: smartResult.errors,
        warnings: smartResult.warnings
      }
      
    } catch (error) {
      console.error("Smart Parser PDF processing failed:", error)
      
      // Fallback to basic processing
      const fallbackText = `PDF document uploaded successfully (${buffer.length} bytes). 
      
Note: Enhanced PDF processing failed, but the document has been uploaded and stored.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}

The system will attempt to process this document with basic text extraction.`
      
      return {
        text: fallbackText,
        wordCount: fallbackText.split(/\s+/).filter(word => word.length > 0).length,
        pages: 1,
        metadata: {
          error: "Smart Parser failed, using fallback",
          originalError: error instanceof Error ? error.message : "Unknown error",
          bufferSize: buffer.length,
          uploaded: true,
          processingVersion: "1.0.0 (fallback)"
        },
        hasErrors: true,
        errors: [`Smart Parser failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: ['Using fallback processing']
      }
    }
  }

  /**
   * Process DOCX documents and extract text content
   */
  static async processDOCX(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      
      return {
        text: result.value,
        wordCount: result.value.split(/\s+/).length,
        metadata: {
          messages: result.messages
        }
      }
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process CSV documents and extract structured data
   */
  static async processCSV(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      return new Promise((resolve, reject) => {
        const results: any[] = []
        const stream = Readable.from(buffer)
        
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            const text = results.map(row => 
              Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
            ).join('\n')
            
            resolve({
              text,
              wordCount: text.split(/\s+/).length,
              metadata: {
                rows: results.length,
                columns: results.length > 0 ? Object.keys(results[0]) : [],
                sampleData: results.slice(0, 5) // First 5 rows for context
              }
            })
          })
          .on('error', (error) => reject(error))
      })
    } catch (error) {
      throw new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process Markdown documents
   */
  static async processMarkdown(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      return {
        text,
        wordCount: text.split(/\s+/).length,
        metadata: {
          lines: text.split('\n').length,
          hasHeaders: /^#\s/.test(text),
          hasCodeBlocks: /```[\s\S]*```/.test(text)
        }
      }
    } catch (error) {
      throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process text files
   */
  static async processText(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      return {
        text,
        wordCount: text.split(/\s+/).length,
        metadata: {
          lines: text.split('\n').length,
          encoding: 'utf-8'
        }
      }
    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Main processing function that routes to appropriate processor
   */
  static async processDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<ProcessedDocument> {
    try {
      console.log(`DocumentProcessor: Processing ${fileName} (${mimeType}) with buffer size ${buffer.length} bytes`)
      
      // Determine file type and process accordingly
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        console.log(`Routing to PDF processor for: ${fileName} (enhanced parsing coming soon)`)
        return await this.processPDF(buffer)
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileName.toLowerCase().endsWith('.docx')) {
        console.log(`Routing to DOCX processor for: ${fileName}`)
        return await this.processDOCX(buffer)
      } else if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        console.log(`Routing to CSV processor for: ${fileName}`)
        return await this.processCSV(buffer)
      } else if (mimeType === 'text/markdown' || fileName.toLowerCase().endsWith('.md')) {
        console.log(`Routing to Markdown processor for: ${fileName}`)
        return await this.processMarkdown(buffer)
      } else if (mimeType.startsWith('text/') || 
                 fileName.toLowerCase().endsWith('.txt')) {
        console.log(`Routing to Text processor for: ${fileName}`)
        return await this.processText(buffer)
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }
    } catch (error) {
      console.error(`DocumentProcessor error for ${fileName}:`, error)
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
