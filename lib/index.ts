// Main library exports
export * from './core'
export * from './processors'
export * from './analyzers'

// Legacy exports for backward compatibility
export { AIService } from './aiService'
export { DocumentProcessor } from './documentProcessor'
export { PDFTextExtractor } from './pdfTextExtractor'
export { SmartDocumentProcessor } from './smartDocumentProcessor'
export { cn } from './utils'

// Smart Parser exports
export * from './smartParser'

// Note: AWS exports removed as the module doesn't exist
