// Import the internal implementation to avoid index.js debug harness reading test PDFs
const pdfParse = require('pdf-parse/lib/pdf-parse.js')
const { PDFDocument } = require('pdf-lib')

class FixedPDFParser {
  /**
   * Parse PDF using the working pdf-parse configuration
   */
  static async parsePDF(buffer) {
    const startTime = Date.now()
    const errors = []
    const warnings = []
    
    try {
      console.log(`Fixed PDF Parser: Processing PDF (${buffer.length} bytes)`)
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error("Invalid buffer: empty or null")
      }
      
      // Step 1: Extract metadata using pdf-lib
      let metadata = {
        title: 'PDF Document',
        author: 'Unknown',
        subject: 'PDF Document',
        creator: 'Unknown',
        producer: 'Unknown',
        creationDate: new Date().toISOString(),
        modificationDate: new Date().toISOString(),
        pageCount: 1,
        fileSize: buffer.length,
        isEncrypted: false
      }
      
      try {
        const pdfDoc = await PDFDocument.load(buffer)
        const pages = pdfDoc.getPages()
        metadata.pageCount = pages.length
        metadata.isEncrypted = pdfDoc.isEncrypted
        
        if (pdfDoc.isEncrypted) {
          throw new Error("PDF is encrypted and cannot be processed without password")
        }
      } catch (metadataError) {
        console.warn(`Metadata extraction failed: ${metadataError}`)
        warnings.push(`Metadata extraction failed: ${metadataError}`)
      }
      
      // Step 2: Extract text using pdf-parse with the working configuration
      let text = ''
      let processingMethod = 'pdf-parse'
      
      try {
        const pdfData = await pdfParse(buffer, {
          // These are the options that made it work in our tests
          normalizeWhitespace: true,
          disableCombineTextItems: false
        })
        
        text = pdfData.text || ''
        
        // Validate extracted text
        if (!text || text.trim().length === 0) {
          throw new Error("No text content extracted from PDF")
        }
        
        console.log(`PDF parsing successful: ${text.length} characters, ${text.split(/\s+/).filter(word => word.length > 0).length} words`)
        
      } catch (parseError) {
        console.error(`PDF parsing failed: ${parseError}`)
        errors.push(`PDF parsing failed: ${parseError}`)
        throw parseError
      }
      
      const processingTime = Date.now() - startTime
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      // Calculate confidence based on text quality
      const confidence = this.calculateConfidence(text)
      
      return {
        text: text.trim(),
        wordCount,
        pages: metadata.pageCount,
        processingTime,
        confidence,
        processingMethod,
        metadata,
        hasErrors: errors.length > 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error("Fixed PDF Parser failed:", error)
      
      return {
        text: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        wordCount: 0,
        pages: 1,
        processingTime,
        confidence: 0,
        processingMethod: 'failed',
        metadata: {
          title: 'PDF Document (Processing Failed)',
          author: 'Unknown',
          subject: 'PDF processing error',
          creator: 'VoiceLoop HR System',
          producer: 'Fixed PDF Parser',
          creationDate: new Date().toISOString(),
          modificationDate: new Date().toISOString(),
          pageCount: 1,
          fileSize: buffer.length,
          isEncrypted: false
        },
        hasErrors: true,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
  
  /**
   * Calculate confidence score based on text quality
   */
  static calculateConfidence(text) {
    if (!text || text.trim().length === 0) {
      return 0
    }
    
    // Check for garbled text indicators
    const garbledPatterns = [
      /\x00/, // Null bytes
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/, // Control characters
      /[^\x20-\x7E\u00A0-\uFFFF\s]/, // Non-printable characters
      /\\x[0-9a-fA-F]{2}/, // Hex escape sequences
      /\\u[0-9a-fA-F]{4}/, // Unicode escape sequences
    ]
    
    const hasGarbledText = garbledPatterns.some(pattern => pattern.test(text))
    
    if (hasGarbledText) {
      return 0.1 // Very low confidence if garbled
    }
    
    // Calculate readability score
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const avgWordLength = words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0
    
    // Check for meaningful content
    const hasMeaningfulWords = words.some(word => word.length > 2)
    const hasPunctuation = /[.!?,;:]/.test(text)
    const hasCapitalization = /[A-Z]/.test(text)
    
    let confidence = 0
    if (hasMeaningfulWords) confidence += 0.3
    if (hasPunctuation) confidence += 0.2
    if (hasCapitalization) confidence += 0.2
    if (avgWordLength > 3 && avgWordLength < 12) confidence += 0.2
    if (!hasGarbledText) confidence += 0.1
    
    return Math.min(confidence, 1.0)
  }
}

module.exports = { FixedPDFParser }
