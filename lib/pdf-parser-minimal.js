// Import the internal implementation to avoid index.js debug harness reading test PDFs
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

class MinimalPDFParser {
  static async parsePDF(buffer) {
    try {
      console.log(`Minimal PDF Parser: Processing PDF (${buffer.length} bytes)`)
      
      if (!buffer || buffer.length === 0) {
        throw new Error("Invalid buffer: empty or null")
      }
      
      const pdfData = await pdfParse(buffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      })
      
      const text = pdfData.text || ''
      
      if (!text || text.trim().length === 0) {
        throw new Error("No text content extracted from PDF")
      }
      
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      console.log(`PDF parsing successful: ${text.length} characters, ${wordCount} words`)
      
      return {
        text: text.trim(),
        wordCount,
        pages: pdfData.numpages || 1,
        processingTime: 0,
        confidence: 1.0,
        processingMethod: 'pdf-parse-minimal',
        hasErrors: false
      }
      
    } catch (error) {
      console.error("Minimal PDF Parser failed:", error)
      
      return {
        text: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        wordCount: 0,
        pages: 1,
        processingTime: 0,
        confidence: 0,
        processingMethod: 'failed',
        hasErrors: true,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

module.exports = { MinimalPDFParser }
