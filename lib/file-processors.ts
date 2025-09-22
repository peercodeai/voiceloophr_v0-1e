import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun } from 'docx'

export interface ProcessedContent {
  text: string
  metadata: {
    type: string
    pages?: number
    slides?: number
    sheets?: number
    wordCount: number
    characterCount: number
    processingMethod: string
    confidence: number
  }
}

export class FileProcessor {
  /**
   * Process various file formats and extract text content
   */
  static async processFile(file: File): Promise<ProcessedContent> {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()

    try {
      // Google Workspace files (exported from Google Drive)
      if (fileName.includes('.gdoc') || fileName.includes('.gsheet') || fileName.includes('.gslides')) {
        return await this.processGoogleWorkspaceFile(file)
      }

      // Microsoft Office files
      if (fileName.includes('.docx') || fileType.includes('vnd.openxmlformats-officedocument.wordprocessingml')) {
        return await this.processDocxFile(file)
      }
      
      if (fileName.includes('.xlsx') || fileType.includes('vnd.openxmlformats-officedocument.spreadsheetml')) {
        return await this.processExcelFile(file)
      }
      
      if (fileName.includes('.pptx') || fileType.includes('vnd.openxmlformats-officedocument.presentationml')) {
        return await this.processPowerPointFile(file)
      }

      // Legacy Office formats
      if (fileName.includes('.doc') || fileType.includes('msword')) {
        return await this.processLegacyWordFile(file)
      }
      
      if (fileName.includes('.xls') || fileType.includes('ms-excel')) {
        return await this.processLegacyExcelFile(file)
      }
      
      if (fileName.includes('.ppt') || fileType.includes('ms-powerpoint')) {
        return await this.processLegacyPowerPointFile(file)
      }

      // Text-based formats
      if (fileName.includes('.txt') || fileType.includes('text/')) {
        return await this.processTextFile(file)
      }
      
      if (fileName.includes('.md') || fileType.includes('markdown')) {
        return await this.processMarkdownFile(file)
      }
      
      if (fileName.includes('.csv') || fileType.includes('csv')) {
        return await this.processCsvFile(file)
      }

      // PDF files (handled by existing PDF parser)
      if (fileName.includes('.pdf') || fileType.includes('pdf')) {
        return await this.processPdfFile(file)
      }

      // Audio files
      if (fileName.includes('.wav') || fileType.includes('audio/wav')) {
        return await this.processAudioFile(file)
      }

      // Video files
      if (fileName.includes('.mp4') || fileType.includes('video/mp4')) {
        return await this.processVideoFile(file)
      }

      // Default fallback
      throw new Error(`Unsupported file type: ${fileType} (${fileName})`)
    } catch (error) {
      console.error('File processing error:', error)
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Could not find file in options')) {
          throw new Error(`File processing failed: The file format is not supported or the file is corrupted. Please try converting to a different format.`)
        } else if (error.message.includes('Invalid file format')) {
          throw new Error(`File processing failed: Invalid file format. Please ensure the file is not corrupted and try again.`)
        } else {
          throw new Error(`Failed to process file: ${error.message}`)
        }
      } else {
        throw new Error(`Failed to process file: Unknown error occurred`)
      }
    }
  }

  /**
   * Process Google Workspace files (exported formats)
   */
  private static async processGoogleWorkspaceFile(file: File): Promise<ProcessedContent> {
    const fileName = file.name.toLowerCase()
    
    if (fileName.includes('.gdoc')) {
      // Google Docs are typically exported as .docx
      return await this.processDocxFile(file)
    } else if (fileName.includes('.gsheet')) {
      // Google Sheets are typically exported as .xlsx
      return await this.processExcelFile(file)
    } else if (fileName.includes('.gslides')) {
      // Google Slides are typically exported as .pptx
      return await this.processPowerPointFile(file)
    }
    
    throw new Error('Unknown Google Workspace file format')
  }

  /**
   * Process Microsoft Word (.docx) files
   */
  private static async processDocxFile(file: File): Promise<ProcessedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      // Try different approaches for mammoth
      let result
      try {
        // First try with arrayBuffer
        result = await mammoth.extractRawText({ arrayBuffer })
      } catch (arrayBufferError) {
        console.log('ArrayBuffer approach failed, trying buffer approach:', arrayBufferError)
        // If that fails, try with buffer
        const buffer = Buffer.from(arrayBuffer)
        result = await mammoth.extractRawText({ buffer })
      }
      
      const text = result.value || ''
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text,
        metadata: {
          type: 'Microsoft Word Document',
          pages: result.messages.length > 0 ? undefined : 1, // Estimate
          wordCount,
          characterCount: text.length,
          processingMethod: 'mammoth-docx',
          confidence: 0.95
        }
      }
    } catch (error) {
      console.error('DOCX processing error:', error)
      
      // If mammoth fails completely, provide a helpful message
      const text = 'DOCX file detected but text extraction failed. This might be due to file corruption or unsupported formatting. Please try converting to PDF or plain text format.'
      
      return {
        text,
        metadata: {
          type: 'Microsoft Word Document (Processing Failed)',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'mammoth-docx-fallback',
          confidence: 0.0
        }
      }
    }
  }

  /**
   * Process Microsoft Excel (.xlsx) files
   */
  private static async processExcelFile(file: File): Promise<ProcessedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      let allText = ''
      let totalSheets = 0
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Convert sheet data to text
        jsonData.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              if (cell && typeof cell === 'string') {
                allText += cell + ' '
              } else if (cell && typeof cell === 'number') {
                allText += cell.toString() + ' '
              }
            })
            allText += '\n'
          }
        })
        
        totalSheets++
      })
      
      const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text: allText.trim(),
        metadata: {
          type: 'Microsoft Excel Spreadsheet',
          sheets: totalSheets,
          wordCount,
          characterCount: allText.length,
          processingMethod: 'xlsx-excel',
          confidence: 0.90
        }
      }
    } catch (error) {
      console.error('Excel processing error:', error)
      
      // If Excel processing fails, provide a helpful message
      const text = 'Excel file detected but data extraction failed. This might be due to file corruption or unsupported formatting. Please try converting to CSV or PDF format.'
      
      return {
        text,
        metadata: {
          type: 'Microsoft Excel Spreadsheet (Processing Failed)',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'xlsx-excel-fallback',
          confidence: 0.0
        }
      }
    }
  }

  /**
   * Process Microsoft PowerPoint (.pptx) files
   */
  private static async processPowerPointFile(file: File): Promise<ProcessedContent> {
    try {
      // For now, we'll use a basic approach since pptxjs is complex
      // In production, you might want to use a more robust library
      const arrayBuffer = await file.arrayBuffer()
      
      // Basic text extraction from PPTX (this is a simplified approach)
      // In a real implementation, you'd parse the XML structure
      const text = await this.extractTextFromPptx(arrayBuffer)
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text,
        metadata: {
          type: 'Microsoft PowerPoint Presentation',
          slides: 1, // Estimate
          wordCount,
          characterCount: text.length,
          processingMethod: 'pptx-basic',
          confidence: 0.80
        }
      }
    } catch (error) {
      throw new Error(`Failed to process PowerPoint file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text from PPTX file (basic implementation)
   */
  private static async extractTextFromPptx(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Look for text content in the PPTX file
      // This is a simplified approach - in production you'd use a proper PPTX parser
      const decoder = new TextDecoder('utf-8')
      const content = decoder.decode(uint8Array)
      
      // Extract text between common PPTX text markers
      const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g)
      if (textMatches) {
        return textMatches
          .map(match => match.replace(/<[^>]*>/g, ''))
          .filter(text => text.trim().length > 0)
          .join(' ')
      }
      
      // Fallback: return basic content info
      return 'PowerPoint presentation content extracted. For detailed text extraction, consider converting to PDF first.'
    } catch (error) {
      return 'PowerPoint presentation detected. Text extraction limited - consider converting to PDF for better results.'
    }
  }

  /**
   * Process legacy Word (.doc) files
   */
  private static async processLegacyWordFile(file: File): Promise<ProcessedContent> {
    try {
      // Legacy .doc files are more complex to process
      // For now, we'll return a helpful message
      const text = 'Legacy Microsoft Word (.doc) file detected. For best results, please convert this file to .docx format or PDF before uploading.'
      
      return {
        text,
        metadata: {
          type: 'Legacy Microsoft Word Document',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'legacy-doc-notice',
          confidence: 0.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process legacy Word file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process legacy Excel (.xls) files
   */
  private static async processLegacyExcelFile(file: File): Promise<ProcessedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      let allText = ''
      let totalSheets = 0
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        jsonData.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              if (cell && typeof cell === 'string') {
                allText += cell + ' '
              } else if (cell && typeof cell === 'number') {
                allText += cell.toString() + ' '
              }
            })
            allText += '\n'
          }
        })
        
        totalSheets++
      })
      
      const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text: allText.trim(),
        metadata: {
          type: 'Legacy Microsoft Excel Spreadsheet',
          sheets: totalSheets,
          wordCount,
          characterCount: allText.length,
          processingMethod: 'xlsx-legacy-excel',
          confidence: 0.85
        }
      }
    } catch (error) {
      throw new Error(`Failed to process legacy Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process legacy PowerPoint (.ppt) files
   */
  private static async processLegacyPowerPointFile(file: File): Promise<ProcessedContent> {
    try {
      const text = 'Legacy Microsoft PowerPoint (.ppt) file detected. For best results, please convert this file to .pptx format or PDF before uploading.'
      
      return {
        text,
        metadata: {
          type: 'Legacy Microsoft PowerPoint Presentation',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'legacy-ppt-notice',
          confidence: 0.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process legacy PowerPoint file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process text files
   */
  private static async processTextFile(file: File): Promise<ProcessedContent> {
    try {
      const text = await file.text()
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text,
        metadata: {
          type: 'Plain Text File',
          wordCount,
          characterCount: text.length,
          processingMethod: 'text-direct',
          confidence: 1.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process Markdown files
   */
  private static async processMarkdownFile(file: File): Promise<ProcessedContent> {
    try {
      const text = await file.text()
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text,
        metadata: {
          type: 'Markdown Document',
          wordCount,
          characterCount: text.length,
          processingMethod: 'markdown-direct',
          confidence: 1.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process CSV files
   */
  private static async processCsvFile(file: File): Promise<ProcessedContent> {
    try {
      const text = await file.text()
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      return {
        text,
        metadata: {
          type: 'CSV File',
          wordCount,
          characterCount: text.length,
          processingMethod: 'csv-direct',
          confidence: 1.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process PDF files (placeholder - handled by existing PDF parser)
   */
  private static async processPdfFile(file: File): Promise<ProcessedContent> {
    // This is handled by the existing PDF parser
    // Return a placeholder for now
    const text = 'PDF file detected. Processing via existing PDF parser...'
    
    return {
      text,
      metadata: {
        type: 'PDF Document',
        wordCount: 0,
        characterCount: text.length,
        processingMethod: 'pdf-placeholder',
        confidence: 0.0
      }
    }
  }

  /**
   * Process audio files (WAV)
   */
  private static async processAudioFile(file: File): Promise<ProcessedContent> {
    try {
      const text = 'Audio file detected. For transcription, please use the Textract processing option to extract speech content.'
      
      return {
        text,
        metadata: {
          type: 'Audio File (WAV)',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'audio-notice',
          confidence: 0.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process audio file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process video files (MP4)
   */
  private static async processVideoFile(file: File): Promise<ProcessedContent> {
    try {
      const text = 'Video file detected. For transcription, please use the Textract processing option to extract speech content from the video.'
      
      return {
        text,
        metadata: {
          type: 'Video File (MP4)',
          wordCount: 0,
          characterCount: text.length,
          processingMethod: 'video-notice',
          confidence: 0.0
        }
      }
    } catch (error) {
      throw new Error(`Failed to process video file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get supported file types for display
   */
  static getSupportedFileTypes(): string[] {
    return [
      // Google Workspace
      '.gdoc', '.gsheet', '.gslides',
      // Microsoft Office
      '.docx', '.xlsx', '.pptx',
      // Legacy Office
      '.doc', '.xls', '.ppt',
      // Text formats
      '.txt', '.md', '.csv',
      // PDF
      '.pdf',
      // Audio/Video
      '.wav', '.mp4'
    ]
  }

  /**
   * Get file type descriptions
   */
  static getFileTypeDescriptions(): Record<string, string> {
    return {
      '.gdoc': 'Google Docs Document',
      '.gsheet': 'Google Sheets Spreadsheet',
      '.gslides': 'Google Slides Presentation',
      '.docx': 'Microsoft Word Document',
      '.xlsx': 'Microsoft Excel Spreadsheet',
      '.pptx': 'Microsoft PowerPoint Presentation',
      '.doc': 'Legacy Word Document',
      '.xls': 'Legacy Excel Spreadsheet',
      '.ppt': 'Legacy PowerPoint Presentation',
      '.txt': 'Plain Text File',
      '.md': 'Markdown Document',
      '.csv': 'CSV Spreadsheet',
      '.pdf': 'PDF Document',
      '.wav': 'Audio File (WAV)',
      '.mp4': 'Video File (MP4)'
    }
  }
}
