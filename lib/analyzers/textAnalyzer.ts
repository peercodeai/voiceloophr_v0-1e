export interface TextMetrics {
  wordCount: number
  characterCount: number
  sentenceCount: number
  paragraphCount: number
  averageWordsPerSentence: number
  averageCharactersPerWord: number
  readingTimeMinutes: number
  complexityScore: number
}

export interface TextStructure {
  hasHeaders: boolean
  hasLists: boolean
  hasTables: boolean
  hasCodeBlocks: boolean
  hasFootnotes: boolean
  hasReferences: boolean
  sections: string[]
  tableOfContents: string[]
}

export class TextAnalyzer {
  /**
   * Calculate basic text metrics
   */
  static calculateMetrics(text: string): TextMetrics {
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0)
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0)
    
    const wordCount = words.length
    const characterCount = text.length
    const sentenceCount = sentences.length
    const paragraphCount = paragraphs.length
    
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0
    const averageCharactersPerWord = wordCount > 0 ? characterCount / wordCount : 0
    
    // Reading time: average adult reads 200-250 words per minute
    const readingTimeMinutes = wordCount / 225
    
    // Complexity score based on average word length and sentence length
    const complexityScore = Math.min(10, (averageCharactersPerWord * 2) + (averageWordsPerSentence * 0.1))
    
    return {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerSentence,
      averageCharactersPerWord,
      readingTimeMinutes,
      complexityScore
    }
  }

  /**
   * Analyze text structure
   */
  static analyzeStructure(text: string): TextStructure {
    const lines = text.split('\n')
    
    // Check for headers (lines starting with # or all caps)
    const hasHeaders = lines.some(line => 
      line.trim().startsWith('#') || 
      (line.trim().length > 3 && line.trim() === line.trim().toUpperCase())
    )
    
    // Check for lists (lines starting with -, *, •, or numbers)
    const hasLists = lines.some(line => 
      /^[\s]*[-*•]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)
    )
    
    // Check for tables (lines with multiple | characters)
    const hasTables = lines.some(line => 
      line.split('|').length > 2
    )
    
    // Check for code blocks (lines with ``` or indented code)
    const hasCodeBlocks = text.includes('```') || 
      lines.some(line => line.startsWith('    ') || line.startsWith('\t'))
    
    // Check for footnotes
    const hasFootnotes = text.includes('[^') || text.includes('^[')
    
    // Check for references
    const hasReferences = text.includes('References') || text.includes('Bibliography')
    
    // Extract sections (lines that look like headers)
    const sections = lines
      .filter(line => 
        line.trim().startsWith('#') || 
        (line.trim().length > 3 && line.trim() === line.trim().toUpperCase() && line.trim().length < 100)
      )
      .map(line => line.trim().replace(/^#+\s*/, ''))
    
    // Extract table of contents
    const tableOfContents = lines
      .filter(line => 
        line.trim().startsWith('#') && 
        line.trim().includes('.')
      )
      .map(line => line.trim().replace(/^#+\s*/, ''))
    
    return {
      hasHeaders,
      hasLists,
      hasTables,
      hasCodeBlocks,
      hasFootnotes,
      hasReferences,
      sections,
      tableOfContents
    }
  }

  /**
   * Detect document language
   */
  static detectLanguage(text: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    const spanishWords = ['el', 'la', 'los', 'las', 'y', 'o', 'en', 'con', 'por', 'para', 'de', 'del']
    const frenchWords = ['le', 'la', 'les', 'et', 'ou', 'en', 'avec', 'pour', 'de', 'du', 'des']
    const germanWords = ['der', 'die', 'das', 'und', 'oder', 'in', 'mit', 'für', 'von', 'zu']
    
    const words = text.toLowerCase().split(/\s+/)
    const wordCount = words.length
    
    if (wordCount === 0) return 'unknown'
    
    const englishCount = words.filter(word => englishWords.includes(word)).length
    const spanishCount = words.filter(word => spanishWords.includes(word)).length
    const frenchCount = words.filter(word => frenchWords.includes(word)).length
    const germanCount = words.filter(word => germanWords.includes(word)).length
    
    const englishScore = englishCount / wordCount
    const spanishScore = spanishCount / wordCount
    const frenchScore = frenchCount / wordCount
    const germanScore = germanCount / wordCount
    
    const maxScore = Math.max(englishScore, spanishScore, frenchScore, germanScore)
    
    if (maxScore < 0.1) return 'unknown'
    
    if (maxScore === englishScore) return 'en'
    if (maxScore === spanishScore) return 'es'
    if (maxScore === frenchScore) return 'fr'
    if (maxScore === germanScore) return 'de'
    
    return 'en' // Default to English
  }

  /**
   * Generate text summary
   */
  static generateSummary(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) {
      return text
    }
    
    // Find the first sentence that fits within the limit
    const sentences = text.split(/[.!?]+/)
    let summary = ''
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (trimmed.length === 0) continue
      
      if ((summary + trimmed).length <= maxLength) {
        summary += (summary ? ' ' : '') + trimmed
      } else {
        break
      }
    }
    
    // If no sentences fit, truncate the text
    if (!summary) {
      summary = text.substring(0, maxLength - 3) + '...'
    }
    
    return summary
  }

  /**
   * Calculate text readability score
   */
  static calculateReadability(text: string): number {
    const metrics = this.calculateMetrics(text)
    
    // Flesch Reading Ease formula
    // Score = 206.835 - (1.015 × average words per sentence) - (84.6 × average syllables per word)
    // For simplicity, we'll estimate syllables per word as characters per word / 3
    
    const averageSyllablesPerWord = metrics.averageCharactersPerWord / 3
    const fleschScore = 206.835 - (1.015 * metrics.averageWordsPerSentence) - (84.6 * averageSyllablesPerWord)
    
    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, fleschScore))
  }

  /**
   * Extract key phrases from text
   */
  static extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
    
    const wordFreq: { [key: string]: number } = {}
    
    // Count word frequencies
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    })
    
    // Sort by frequency and return top phrases
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxPhrases)
      .map(([word]) => word)
  }
}
