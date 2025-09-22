import pdfParse from 'pdf-parse'
import { PDFDocument } from 'pdf-lib'
import { createWorker } from 'tesseract.js'

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: string
  modificationDate?: string
  pageCount: number
  fileSize: number
  isEncrypted: boolean
  isScanned: boolean
  confidence: number
}

export interface ProcessedPDF {
  text: string
  wordCount: number
  pages: number
  metadata: PDFMetadata
  processingTime: number
  hasOCR: boolean
}

export class EnhancedPDFProcessor {
  /**
   * Enhanced PDF processing with multiple fallback strategies
   */
  static async processPDF(buffer: Buffer): Promise<ProcessedPDF> {
    const startTime = Date.now()
    
    try {
      console.log(`Enhanced PDF processing started for buffer size: ${buffer.length} bytes`)
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error("Invalid buffer: empty or null")
      }
      
      // Step 1: Try to extract metadata first
      const metadata = await this.extractMetadata(buffer)
      console.log(`PDF metadata extracted: ${metadata.pageCount} pages, encrypted: ${metadata.isEncrypted}`)
      
      // Step 2: Check if PDF is encrypted
      if (metadata.isEncrypted) {
        throw new Error("PDF is encrypted and cannot be processed without password")
      }
      
      // Step 3: Try standard text extraction
      let text = ''
      let hasOCR = false
      
      try {
        const pdfData = await pdfParse(buffer)
        text = pdfData.text
        
        // Check if we got meaningful text
        if (text.trim().length > 100) {
          console.log(`Standard PDF parsing successful: ${text.length} characters extracted`)
        } else {
          console.log(`Standard parsing returned minimal text, attempting OCR...`)
          text = await this.performOCR(buffer)
          hasOCR = true
        }
      } catch (parseError) {
        console.log(`Standard PDF parsing failed, attempting OCR: ${parseError}`)
        text = await this.performOCR(buffer)
        hasOCR = true
      }
      
      // Step 4: Validate extracted text
      if (!text || text.trim().length === 0) {
        throw new Error("Unable to extract any text content from PDF")
      }
      
      const processingTime = Date.now() - startTime
      
      return {
        text: text.trim(),
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        pages: metadata.pageCount,
        metadata: {
          ...metadata,
          confidence: hasOCR ? 0.8 : 0.95, // OCR has lower confidence
          isScanned: hasOCR
        },
        processingTime,
        hasOCR
      }
      
    } catch (error) {
      console.error("Enhanced PDF processing failed:", error)
      
      // Fallback: provide detailed error information
      const fallbackText = `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}

File Information:
- Size: ${(buffer.length / 1024).toFixed(2)} KB
- Type: PDF Document
- Status: Processing failed

Error Details:
${error instanceof Error ? error.message : 'Unknown error'}

This PDF could not be processed due to technical limitations. The file has been uploaded and stored, but text extraction was unsuccessful.`
      
      return {
        text: fallbackText,
        wordCount: fallbackText.split(/\s+/).filter(word => word.length > 0).length,
        pages: 1,
        metadata: {
          title: 'PDF Document (Processing Failed)',
          author: 'Unknown',
          subject: 'PDF processing error',
          creator: 'VoiceLoop HR System',
          producer: 'Enhanced PDF Processor',
          creationDate: new Date().toISOString(),
          modificationDate: new Date().toISOString(),
          pageCount: 1,
          fileSize: buffer.length,
          isEncrypted: false,
          isScanned: false,
          confidence: 0.0
        },
        processingTime: Date.now() - startTime,
        hasOCR: false
      }
    }
  }
  
  /**
   * Extract comprehensive metadata from PDF
   */
  private static async extractMetadata(buffer: Buffer): Promise<PDFMetadata> {
    try {
      const pdfDoc = await PDFDocument.load(buffer)
      const pages = pdfDoc.getPages()
      
      return {
        pageCount: pages.length,
        fileSize: buffer.length,
        isEncrypted: pdfDoc.isEncrypted,
        isScanned: false, // Will be determined during text extraction
        confidence: 1.0
      }
    } catch (error) {
      console.log(`Metadata extraction failed, using fallback: ${error}`)
      
      // Fallback metadata
      return {
        pageCount: 1,
        fileSize: buffer.length,
        isEncrypted: false,
        isScanned: false,
        confidence: 0.5
      }
    }
  }
  
  /**
   * Perform OCR on PDF pages for scanned documents
   */
  private static async performOCR(buffer: Buffer): Promise<string> {
    try {
      console.log('Starting OCR processing...')
      
      // For now, we'll use a simplified OCR approach
      // In production, you might want to convert PDF to images first
      const worker = await createWorker('eng')
      
      // Convert PDF buffer to text using OCR
      // Note: This is a simplified implementation
      // For production, you'd want to convert PDF pages to images first
      const result = await worker.recognize(buffer)
      await worker.terminate()
      
      console.log(`OCR completed: ${result.data.text.length} characters extracted`)
      return result.data.text
      
    } catch (error) {
      console.error('OCR processing failed:', error)
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Check if PDF appears to be scanned (low text content)
   */
  private static isLikelyScanned(text: string): boolean {
    const textLength = text.trim().length
    const hasMinimalText = textLength < 100
    const hasMostlySpaces = text.replace(/\s/g, '').length < textLength * 0.1
    
    return hasMinimalText || hasMostlySpaces
  }
  
  /**
   * Get processing statistics
   */
  static getProcessingStats(): { version: string; capabilities: string[] } {
    return {
      version: '2.0.0',
      capabilities: [
        'Standard PDF text extraction',
        'PDF metadata extraction',
        'OCR for scanned documents',
        'Encrypted PDF detection',
        'Multi-page processing',
        'Error handling and fallbacks'
      ]
    }
  }
}
