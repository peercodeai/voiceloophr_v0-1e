// Import processor classes
import { AudioProcessor } from './audioProcessor'
import { VideoProcessor } from './videoProcessor'
import { DocumentProcessor } from './documentProcessor'

// Export all processor classes
export { AudioProcessor } from './audioProcessor'
export { VideoProcessor } from './videoProcessor'
export { DocumentProcessor } from './documentProcessor'

// Export types
export type { AudioMetadata, AudioTranscription } from './audioProcessor'
export type { VideoMetadata, VideoFrame } from './videoProcessor'
export type { DocumentMetadata, DocumentContent, ProcessingResult } from './documentProcessor'

// Main processor factory
export class ProcessorFactory {
  /**
   * Get the appropriate processor for a file type
   */
  static getProcessor(mimeType: string, fileName: string) {
    if (AudioProcessor.isSupported(mimeType, fileName)) {
      return AudioProcessor
    }
    
    if (VideoProcessor.isSupported(mimeType, fileName)) {
      return VideoProcessor
    }
    
    if (DocumentProcessor.isSupported(mimeType, fileName)) {
      return DocumentProcessor
    }
    
    throw new Error(`No processor found for file type: ${mimeType} (${fileName})`)
  }

  /**
   * Check if any processor supports the file type
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    return AudioProcessor.isSupported(mimeType, fileName) ||
           VideoProcessor.isSupported(mimeType, fileName) ||
           DocumentProcessor.isSupported(mimeType, fileName)
  }

  /**
   * Get all supported file types
   */
  static getSupportedTypes(): string[] {
    return [
      ...AudioProcessor.getSupportedTypes(),
      ...VideoProcessor.getSupportedTypes(),
      ...DocumentProcessor.getSupportedTypes()
    ]
  }
}
