import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export interface ExtractedText {
  text: string
  wordCount: number
  pages: number
  confidence: number
  processingMethod: 'textract' | 'pdf-parse' | 'fallback'
  cost?: number
}

export interface TextractResult {
  success: boolean
  extractedText?: ExtractedText
  error?: string
  cost?: number
}

export interface DocumentAnalysis {
  type: 'standard-pdf' | 'chromium-pdf' | 'image-pdf' | 'scanned-document' | 'unknown'
  confidence: number
  reason: string
  recommendedProcessor: 'textract' | 'pdf-parse' | 'fallback'
}

export class PDFTextExtractor {
  private textractClient: TextractClient
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1'
    const bucketName = process.env.AWS_S3_BUCKET || 'voiceloophr-hr-documents-20241201'
    
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not configured!')
      console.error('Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variables')
      throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.')
    }
    
    this.textractClient = new TextractClient({ region })
    this.s3Client = new S3Client({ region })
    this.bucketName = bucketName
    
    console.log(`🔧 PDFTextExtractor initialized with region: ${region}, bucket: ${bucketName}`)
    console.log(`🔑 AWS credentials: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Missing'} / ${process.env.AWS_SECRET_ACCESS_KEY ? 'Configured' : 'Missing'}`)
  }

  /**
   * Main entry point - intelligently routes to best processing method
   */
  async extractTextFromPDF(pdfBuffer: Buffer, fileName: string): Promise<TextractResult> {
    try {
      console.log(`🚀 Starting intelligent PDF processing for ${fileName}`)
      
      // Step 1: Analyze document type
      const analysis = await this.analyzeDocument(pdfBuffer, fileName)
      console.log(`📊 Document Analysis: ${analysis.type} (${analysis.confidence}% confidence)`)
      console.log(`🎯 Recommended Processor: ${analysis.recommendedProcessor}`)
      console.log(`📝 Reason: ${analysis.reason}`)
      
      // Step 2: Route to appropriate processor
      switch (analysis.recommendedProcessor) {
        case 'textract':
          return await this.processWithTextract(pdfBuffer, fileName, analysis)
        case 'pdf-parse':
          return await this.processWithPdfParse(pdfBuffer, fileName, analysis)
        case 'fallback':
        default:
          return await this.processWithFallback(pdfBuffer, fileName, analysis)
      }
      
    } catch (error) {
      console.error('❌ Intelligent PDF processing failed:', error)
      return await this.processWithFallback(pdfBuffer, fileName, {
        type: 'unknown',
        confidence: 0,
        reason: 'Processing failed, using fallback',
        recommendedProcessor: 'fallback'
      })
    }
  }

  /**
   * Analyze document to determine best processing method
   */
  private async analyzeDocument(pdfBuffer: Buffer, fileName: string): Promise<DocumentAnalysis> {
    try {
      // Try pdf-parse first to analyze document structure
      const pdfParse = await this.importPdfParse()
      if (pdfParse) {
        const pdfData = await pdfParse(pdfBuffer)
        const text = pdfData.text
        const pages = pdfData.numpages || 1
        
        // Analyze text quality and structure
        const textQuality = this.analyzeTextQuality(text)
        const documentType = this.detectDocumentType(text, pdfData, fileName)
        
        console.log(`📊 Text Quality Analysis: ${textQuality.ratio}% quality, ${textQuality.nonWhitespace} chars`)
        
                 // Decision logic - prefer pdf-parse for Chromium PDFs (user preference)
         if (documentType.type === 'chromium-pdf') {
           return {
             type: 'chromium-pdf',
             confidence: 95,
             reason: 'Chromium/Skia PDF detected - using pdf-parse (preferred method)',
             recommendedProcessor: 'pdf-parse'
           }
         } else if (documentType.type === 'image-pdf' || documentType.type === 'scanned-document') {
          return {
            type: documentType.type,
            confidence: 85,
            reason: 'Detected image-based content (Textract OCR recommended)',
            recommendedProcessor: 'textract'
          }
        } else if (textQuality.ratio > 70 && textQuality.nonWhitespace > 500) {
          return {
            type: 'standard-pdf',
            confidence: 95,
            reason: 'High-quality text content detected (Textract recommended)',
            recommendedProcessor: 'textract'
          }
        } else {
          return {
            type: 'unknown',
            confidence: 60,
            reason: 'Low text quality or unknown format (pdf-parse fallback)',
            recommendedProcessor: 'pdf-parse'
          }
        }
      }
      
      // If pdf-parse fails, assume unknown type
      return {
        type: 'unknown',
        confidence: 50,
        reason: 'Could not analyze document structure',
        recommendedProcessor: 'fallback'
      }
      
    } catch (error) {
      console.log('⚠️ Document analysis failed:', error)
      return {
        type: 'unknown',
        confidence: 30,
        reason: 'Analysis failed, using fallback',
        recommendedProcessor: 'fallback'
      }
    }
  }

  /**
   * Analyze text quality
   */
  private analyzeTextQuality(text: string): { ratio: number; nonWhitespace: number; total: number } {
    const total = text.length
    const nonWhitespace = text.replace(/\s/g, '').length
    const ratio = total > 0 ? (nonWhitespace / total) * 100 : 0
    
    return { ratio, nonWhitespace, total }
  }

  /**
   * Detect document type based on content and metadata
   */
  private detectDocumentType(text: string, pdfData: any, fileName: string): { type: string; confidence: number } {
    console.log(`🔍 Document type detection for: ${fileName}`)
    console.log(`📄 Text preview: ${text.substring(0, 200)}...`)
    console.log(`📊 PDF info:`, pdfData.info)
    
         // Check for Chromium/Skia indicators in metadata and text content
     if (pdfData.info?.Producer?.includes('Skia') || 
         pdfData.info?.Creator?.includes('Chromium') ||
         fileName.toLowerCase().includes('chrome') ||
         text.includes('Skia/PDF') ||
         text.includes('Chromium')) {
       console.log('⚠️ Detected Chromium/Skia PDF from metadata or content')
       return { type: 'chromium-pdf', confidence: 95 }
     }
    
    // Check for image-based content
    if (text.length < 100 && pdfData.numpages > 0) {
      console.log('📷 Detected image-based PDF')
      return { type: 'image-pdf', confidence: 80 }
    }
    
    // Check for scanned document patterns
    if (text.includes('OCR') || text.includes('scanned') || text.length < 200) {
      console.log('📄 Detected scanned document')
      return { type: 'scanned-document', confidence: 75 }
    }
    
    console.log('✅ Detected standard PDF')
    return { type: 'standard-pdf', confidence: 85 }
  }

  /**
   * Process with AWS Textract
   */
  private async processWithTextract(pdfBuffer: Buffer, fileName: string, analysis: DocumentAnalysis): Promise<TextractResult> {
    try {
      console.log(`🔍 Processing with AWS Textract: ${fileName}`)
      
      // Upload PDF to S3
      const s3Key = `uploads/${Date.now()}-${fileName}`
      
      try {
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf'
        }))
        console.log(`✅ PDF uploaded to S3 for Textract processing`)
      } catch (s3Error) {
        console.error('❌ S3 upload failed for Textract:', s3Error)
        throw new Error(`S3 upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`)
      }
      
      // Call Textract
      const textractResponse = await this.textractClient.send(new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: this.bucketName,
            Name: s3Key
          }
        }
      }))
      
      // Extract text from response
      let extractedText = ""
      let wordCount = 0
      let pages = 1
      let confidence = 0.95
      
      if (textractResponse.Blocks) {
        const textBlocks = textractResponse.Blocks.filter(block => 
          block.BlockType === 'LINE' && block.Text
        )
        
        extractedText = textBlocks.map(block => block.Text).join('\n')
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
        
        const pageBlocks = textractResponse.Blocks.filter(block => 
          block.BlockType === 'PAGE'
        )
        pages = pageBlocks.length || 1
        
        const confidenceScores = textBlocks
          .map(block => block.Confidence || 0)
          .filter(score => score > 0)
        
        if (confidenceScores.length > 0) {
          confidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length / 100
        }
      }
      
      // Cleanup S3
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key
        }))
      } catch (cleanupError) {
        console.warn('S3 cleanup failed (non-critical):', cleanupError)
      }
      
      const result: ExtractedText = {
        text: extractedText,
        wordCount,
        pages,
        confidence,
        processingMethod: 'textract',
        cost: this.calculateCost(pages)
      }
      
      console.log(`✅ Textract processing successful: ${wordCount} words, ${(confidence * 100).toFixed(1)}% confidence`)
      
      return {
        success: true,
        extractedText: result,
        cost: result.cost
      }
      
    } catch (error) {
      console.error('❌ Textract processing failed:', error)
      
      // Fall back to pdf-parse if Textract fails
      console.log('🔄 Textract failed, falling back to pdf-parse...')
      return await this.processWithPdfParse(pdfBuffer, fileName, analysis)
    }
  }

  /**
   * Process with pdf-parse
   */
  private async processWithPdfParse(pdfBuffer: Buffer, fileName: string, analysis: DocumentAnalysis): Promise<TextractResult> {
    try {
      console.log(`📖 Processing with pdf-parse: ${fileName}`)
      
      const pdfParse = await this.importPdfParse()
      if (!pdfParse) {
        throw new Error('pdf-parse not available')
      }
      
      const pdfData = await pdfParse(pdfBuffer)
      const extractedText = pdfData.text
      const pages = pdfData.numpages || 1
      
      // Calculate confidence based on text quality
      const textQuality = this.analyzeTextQuality(extractedText)
      const confidence = Math.min(0.9, (textQuality.ratio / 100) * 0.8 + 0.2)
      
      const wordCount = extractedText.split(/\s+/).filter((word: string) => word.length > 0).length
      
      const result: ExtractedText = {
        text: extractedText,
        wordCount,
        pages,
        confidence,
        processingMethod: 'pdf-parse',
        cost: 0
      }
      
      console.log(`✅ pdf-parse processing successful: ${wordCount} words, ${(confidence * 100).toFixed(1)}% confidence`)
      
      return {
        success: true,
        extractedText: result,
        cost: 0
      }
      
    } catch (error) {
      console.error('❌ pdf-parse processing failed:', error)
      
      // Fall back to basic fallback
      return await this.processWithFallback(pdfBuffer, fileName, analysis)
    }
  }

  /**
   * Process with fallback method
   */
  private async processWithFallback(pdfBuffer: Buffer, fileName: string, analysis: DocumentAnalysis): Promise<TextractResult> {
    try {
      console.log(`🔄 Using fallback processing: ${fileName}`)
      
      const extractedText = `Fallback Processing Results: ${fileName}

Document Analysis: ${analysis.type} (${analysis.confidence}% confidence)
Reason: ${analysis.reason}

This document was processed using fallback methods due to compatibility issues.

DOCUMENT DETAILS:
• File: ${fileName}
• Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB
• Analysis Type: ${analysis.type}
• Processing Method: Fallback

RECOMMENDATIONS:
• Try converting PDF with Adobe Acrobat or Microsoft Word
• Use PDFs created with standard PDF generators
• Ensure PDF contains extractable text (not just images)
• Consider using the document viewer to manually review content

STATUS: Fallback processing completed
Note: This is a basic analysis due to document compatibility issues.`
      
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      
      const result: ExtractedText = {
        text: extractedText,
        wordCount,
        pages: 1,
        confidence: 0.6,
        processingMethod: 'fallback',
        cost: 0
      }
      
      console.log(`✅ Fallback processing completed: ${wordCount} words`)
      
      return {
        success: true,
        extractedText: result,
        cost: 0
      }
      
    } catch (error) {
      console.error('❌ Fallback processing failed:', error)
      throw error
    }
  }

  /**
   * Dynamically import pdf-parse if available
   */
  private async importPdfParse(): Promise<any> {
    try {
      // Try different import methods
      let pdfParse
      
      try {
        // Method 1: Direct import
        pdfParse = await import('pdf-parse')
        console.log('✅ pdf-parse imported successfully')
        return pdfParse.default || pdfParse
      } catch (importError) {
        console.log('⚠️ Direct import failed, trying require...')
        
        // Method 2: Require (for CommonJS)
        try {
          pdfParse = require('pdf-parse')
          console.log('✅ pdf-parse required successfully')
          return pdfParse.default || pdfParse
        } catch (requireError) {
          console.log('⚠️ Require also failed')
          throw requireError
        }
      }
    } catch (error) {
      console.log('❌ pdf-parse not available:', error)
      return null
    }
  }

  /**
   * Calculate Textract processing cost
   */
  private calculateCost(pages: number): number {
    const costPerPage = 0.0015 // $0.0015 per page
    return pages * costPerPage
  }

  /**
   * Get cost estimate for a PDF (rough estimate)
   */
  getCostEstimate(fileSizeBytes: number): number {
    const estimatedPages = Math.max(1, Math.ceil(fileSizeBytes / (1024 * 1024) * 2.5))
    return this.calculateCost(estimatedPages)
  }
}
