import { ProcessorFactory } from '../processors'
import { AnalyzerFactory } from '../analyzers'
import { AudioProcessor } from '../processors/audioProcessor'
import { VideoProcessor } from '../processors/videoProcessor'
import { DocumentProcessor } from '../processors/documentProcessor'

export interface ProcessingResult {
  success: boolean
  fileType: string
  processingMethod: string
  content?: any
  analysis?: any
  error?: string
  processingTime: number
  metadata?: any
}

export interface FileMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  lastModified: Date
  processingMethod: string
  confidence: number
}

export class EnhancedDocumentProcessor {
  /**
   * Process any supported file type
   */
  static async processFile(filePath: string, mimeType: string, fileName: string): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      // Determine file type and get appropriate processor
      let processor: any
      let processingMethod: string
      
      if (AudioProcessor.isSupported(mimeType, fileName)) {
        processor = AudioProcessor
        processingMethod = 'audio'
      } else if (VideoProcessor.isSupported(mimeType, fileName)) {
        processor = VideoProcessor
        processingMethod = 'video'
      } else if (DocumentProcessor.isSupported(mimeType, fileName)) {
        processor = DocumentProcessor
        processingMethod = 'document'
      } else {
        throw new Error(`Unsupported file type: ${mimeType} (${fileName})`)
      }
      
      // Process the file
      let content: any
      let metadata: any
      
      switch (processingMethod) {
        case 'audio':
          metadata = await AudioProcessor.extractMetadata(filePath)
          content = await AudioProcessor.transcribeAudio(filePath)
          break
          
        case 'video':
          metadata = await VideoProcessor.extractMetadata(filePath)
          // For video, we might want to extract audio and transcribe it
          const tempAudioFile = filePath.replace(/\.[^/.]+$/, '_temp.wav')
          await VideoProcessor.extractAudioFromVideo(filePath, tempAudioFile)
          content = await AudioProcessor.transcribeAudio(tempAudioFile)
          break
          
        case 'document':
          const docResult = await DocumentProcessor.processDocument(filePath)
          if (!docResult.success) {
            throw new Error(docResult.error || 'Document processing failed')
          }
          content = docResult.content
          metadata = content.metadata
          break
          
        default:
          throw new Error(`Unknown processing method: ${processingMethod}`)
      }
      
      // Run content analysis if we have text content
      let analysis: any
      if (content && content.text) {
        analysis = await AnalyzerFactory.runFullAnalysis(content.text, fileName)
      }
      
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        fileType: processingMethod,
        processingMethod,
        content,
        analysis,
        processingTime,
        metadata
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        fileType: 'unknown',
        processingMethod: 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      }
    }
  }

  /**
   * Process multiple files
   */
  static async processFiles(files: Array<{ path: string; mimeType: string; name: string }>): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = []
    
    for (const file of files) {
      try {
        const result = await this.processFile(file.path, file.mimeType, file.name)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          fileType: 'unknown',
          processingMethod: 'none',
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: 0
        })
      }
    }
    
    return results
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes(): string[] {
    return ProcessorFactory.getSupportedTypes()
  }

  /**
   * Check if file type is supported
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    return ProcessorFactory.isSupported(mimeType, fileName)
  }

  /**
   * Get processing statistics
   */
  static getProcessingStats(results: ProcessingResult[]) {
    const stats = {
      totalFiles: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      averageProcessingTime: 0,
      fileTypeBreakdown: {} as { [key: string]: number }
    }
    
    if (stats.totalFiles > 0) {
      stats.averageProcessingTime = stats.totalProcessingTime / stats.totalFiles
    }
    
    results.forEach(result => {
      if (result.success) {
        stats.fileTypeBreakdown[result.fileType] = (stats.fileTypeBreakdown[result.fileType] || 0) + 1
      }
    })
    
    return stats
  }

  /**
   * Validate file before processing
   */
  static async validateFile(filePath: string, mimeType: string, fileName: string): Promise<boolean> {
    try {
      if (!this.isSupported(mimeType, fileName)) {
        return false
      }
      
      // Check if file exists and is readable
      const fs = require('fs')
      const stats = fs.statSync(filePath)
      
      if (!stats.isFile() || stats.size === 0) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }
}
