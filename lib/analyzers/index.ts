// Import analyzer classes
import { TextAnalyzer } from './textAnalyzer'
import { EntityExtractor } from './entityExtractor'
import { SentimentAnalyzer } from './sentimentAnalyzer'

// Export all analyzer classes
export { TextAnalyzer } from './textAnalyzer'
export { EntityExtractor } from './entityExtractor'
export { SentimentAnalyzer } from './sentimentAnalyzer'

// Export types
export type { TextMetrics, TextStructure } from './textAnalyzer'
export type { ExtractedEntity, EntityConfidence } from './entityExtractor'
export type { SentimentResult, EmotionScore, KeywordSentiment } from './sentimentAnalyzer'

// Main analyzer factory
export class AnalyzerFactory {
  /**
   * Get all available analyzers
   */
  static getAnalyzers() {
    return {
      text: TextAnalyzer,
      entity: EntityExtractor,
      sentiment: SentimentAnalyzer
    }
  }

  /**
   * Run comprehensive analysis on text
   */
  static async runFullAnalysis(text: string, fileName: string) {
    const startTime = Date.now()
    
    try {
      // Run all analyzers in parallel
      const [textMetrics, textStructure, entities, sentiment] = await Promise.all([
        Promise.resolve(TextAnalyzer.calculateMetrics(text)),
        Promise.resolve(TextAnalyzer.analyzeStructure(text)),
        Promise.resolve(EntityExtractor.extractEntities(text)),
        Promise.resolve(SentimentAnalyzer.analyzeSentiment(text))
      ])
      
      // Detect language and sensitivity
      const language = TextAnalyzer.detectLanguage(text)
      const sensitivity = SentimentAnalyzer.detectSensitivity(text)
      
      // Generate summary and recommendations
      const summary = TextAnalyzer.generateSummary(text)
      const recommendations = SentimentAnalyzer.generateRecommendations(sentiment, sensitivity)
      
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        processingTime,
        analysis: {
          textMetrics,
          textStructure,
          entities,
          sentiment,
          language,
          sensitivity,
          summary,
          recommendations
        }
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      }
    }
  }

  /**
   * Run specific analysis type
   */
  static runAnalysis(type: 'text' | 'entity' | 'sentiment', text: string) {
    switch (type) {
      case 'text':
        return {
          metrics: TextAnalyzer.calculateMetrics(text),
          structure: TextAnalyzer.analyzeStructure(text),
          language: TextAnalyzer.detectLanguage(text),
          summary: TextAnalyzer.generateSummary(text),
          readability: TextAnalyzer.calculateReadability(text),
          keyPhrases: TextAnalyzer.extractKeyPhrases(text)
        }
      case 'entity':
        return EntityExtractor.extractEntities(text)
      case 'sentiment':
        return SentimentAnalyzer.analyzeSentiment(text)
      default:
        throw new Error(`Unknown analysis type: ${type}`)
    }
  }
}
