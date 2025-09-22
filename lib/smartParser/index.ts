import { EnhancedPDFProcessor, ProcessedPDF } from './pdfProcessor'
import { ContentAnalyzer, SmartAnalysis } from './contentAnalyzer'
import { SecurityScanner, SecurityScanResult } from './securityScanner'

export interface SmartParserResult {
  // Basic document info
  fileName: string
  fileSize: number
  mimeType: string
  
  // Processing results
  text: string
  wordCount: number
  pages: number
  
  // Enhanced analysis
  contentAnalysis: SmartAnalysis
  securityScan: SecurityScanResult
  
  // Processing metadata
  processingTime: number
  processingVersion: string
  capabilities: string[]
  
  // Error handling
  hasErrors: boolean
  errors: string[]
  warnings: string[]
}

export interface ProcessingOptions {
  enableContentAnalysis?: boolean
  enableSecurityScan?: boolean
  enableOCR?: boolean
  maxProcessingTime?: number
  enableDetailedLogging?: boolean
}

export class SmartParser {
  private static readonly DEFAULT_OPTIONS: ProcessingOptions = {
    enableContentAnalysis: true,
    enableSecurityScan: true,
    enableOCR: true,
    maxProcessingTime: 30000, // 30 seconds
    enableDetailedLogging: false
  }
  
  /**
   * Main entry point for smart document parsing
   */
  static async parseDocument(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options: ProcessingOptions = {}
  ): Promise<SmartParserResult> {
    const startTime = Date.now()
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options }
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      console.log(`Smart Parser: Starting enhanced processing of ${fileName}`)
      
      // Step 1: Basic document processing
      let text = ''
      let wordCount = 0
      let pages = 1
      
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        console.log('Processing PDF with enhanced parser...')
        const pdfResult = await EnhancedPDFProcessor.processPDF(buffer)
        text = pdfResult.text
        wordCount = pdfResult.wordCount
        pages = pdfResult.pages
        
        if (pdfResult.hasOCR) {
          warnings.push('OCR was used for text extraction - accuracy may be lower')
        }
      } else {
        // For non-PDF files, extract basic text (you can enhance this later)
        text = buffer.toString('utf-8')
        wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      }
      
      // Step 2: Content analysis (if enabled)
      let contentAnalysis: SmartAnalysis | null = null
      if (mergedOptions.enableContentAnalysis) {
        try {
          console.log('Performing content analysis...')
          contentAnalysis = await ContentAnalyzer.analyzeContent(text, fileName)
        } catch (error) {
          const errorMsg = `Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
      
      // Step 3: Security scanning (if enabled)
      let securityScan: SecurityScanResult | null = null
      if (mergedOptions.enableSecurityScan) {
        try {
          console.log('Performing security scan...')
          securityScan = await SecurityScanner.scanDocument(text, fileName)
        } catch (error) {
          const errorMsg = `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
      
      // Step 4: Validate processing time
      const processingTime = Date.now() - startTime
      if (processingTime > mergedOptions.maxProcessingTime!) {
        warnings.push(`Processing took longer than expected: ${processingTime}ms`)
      }
      
      // Step 5: Generate capabilities list
      const capabilities = this.getCapabilities(mergedOptions)
      
      return {
        fileName,
        fileSize: buffer.length,
        mimeType,
        text,
        wordCount,
        pages,
        contentAnalysis: contentAnalysis || this.getDefaultContentAnalysis(),
        securityScan: securityScan || this.getDefaultSecurityScan(),
        processingTime,
        processingVersion: '2.0.0',
        capabilities,
        hasErrors: errors.length > 0,
        errors,
        warnings
      }
      
    } catch (error) {
      console.error('Smart Parser failed:', error)
      
      return {
        fileName,
        fileSize: buffer.length,
        mimeType,
        text: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        wordCount: 0,
        pages: 1,
        contentAnalysis: this.getDefaultContentAnalysis(),
        securityScan: this.getDefaultSecurityScan(),
        processingTime: Date.now() - startTime,
        processingVersion: '2.0.0',
        capabilities: ['Basic text extraction', 'Error handling'],
        hasErrors: true,
        errors: [`Smart parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: ['Document processing incomplete']
      }
    }
  }
  
  /**
   * Get default content analysis when processing fails
   */
  private static getDefaultContentAnalysis(): SmartAnalysis {
    return {
      documentType: 'other',
      confidence: 0.0,
      extractedEntities: {
        dates: [],
        names: [],
        amounts: [],
        organizations: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        urls: []
      },
      contentStructure: {
        sections: [],
        hasTableOfContents: false,
        estimatedReadingTime: 0,
        hasHeaders: false,
        hasLists: false,
        hasTables: false,
        hasCodeBlocks: false
      },
      sensitivityLevel: 'low',
      recommendations: ['Content analysis could not be completed'],
      language: 'unknown',
      summary: 'Content analysis failed'
    }
  }
  
  /**
   * Get default security scan when processing fails
   */
  private static getDefaultSecurityScan(): SecurityScanResult {
    return {
      riskLevel: 'high', // Assume worst case when scan fails
      detectedThreats: ['Security scan failed'],
      piiDetected: true, // Assume worst case
      sensitivePatterns: ['Unknown'],
      recommendations: ['Security scan failed - treat document as high-risk'],
      complianceIssues: ['Unable to determine compliance requirements'],
      encryptionRecommended: true,
      accessControlLevel: 'confidential'
    }
  }
  
  /**
   * Get list of enabled capabilities
   */
  private static getCapabilities(options: ProcessingOptions): string[] {
    const capabilities: string[] = ['Enhanced document processing']
    
    if (options.enableContentAnalysis) {
      capabilities.push('Intelligent content analysis')
      capabilities.push('Document classification')
      capabilities.push('Entity extraction')
      capabilities.push('Content structure analysis')
    }
    
    if (options.enableSecurityScan) {
      capabilities.push('Security scanning')
      capabilities.push('PII detection')
      capabilities.push('Compliance checking')
      capabilities.push('Threat detection')
    }
    
    if (options.enableOCR) {
      capabilities.push('OCR for scanned documents')
    }
    
    return capabilities
  }
  
  /**
   * Get processing statistics
   */
  static getStats(): {
    version: string
    pdfProcessor: any
    contentAnalyzer: any
    securityScanner: any
  } {
    return {
      version: '2.0.0',
      pdfProcessor: EnhancedPDFProcessor.getProcessingStats(),
      contentAnalyzer: { version: '1.0.0', status: 'active' },
      securityScanner: SecurityScanner.getScanStats()
    }
  }
  
  /**
   * Validate all components
   */
  static validateComponents(): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Validate security scanner configuration
    const securityValidation = SecurityScanner.validateConfiguration()
    if (!securityValidation.valid) {
      issues.push(...securityValidation.issues.map(issue => `Security: ${issue}`))
    }
    
    // Add more validation as needed
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
  
  /**
   * Test processing with sample data
   */
  static async testProcessing(): Promise<{ success: boolean; message: string }> {
    try {
      const testBuffer = Buffer.from('This is a test document for the Smart Parser.')
      const result = await this.parseDocument(testBuffer, 'test.txt', 'text/plain')
      
      if (result.hasErrors) {
        return {
          success: false,
          message: `Test processing failed: ${result.errors.join(', ')}`
        }
      }
      
      return {
        success: true,
        message: 'Test processing completed successfully'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Test processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
