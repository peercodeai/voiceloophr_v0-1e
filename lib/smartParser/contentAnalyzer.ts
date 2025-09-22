export interface ExtractedEntity {
  dates: string[]
  names: string[]
  amounts: number[]
  organizations: string[]
  emails: string[]
  phoneNumbers: string[]
  addresses: string[]
  urls: string[]
}

export interface ContentStructure {
  sections: string[]
  hasTableOfContents: boolean
  estimatedReadingTime: number
  hasHeaders: boolean
  hasLists: boolean
  hasTables: boolean
  hasCodeBlocks: boolean
}

export interface SmartAnalysis {
  documentType: 'resume' | 'contract' | 'report' | 'invoice' | 'letter' | 'other'
  confidence: number
  extractedEntities: ExtractedEntity
  contentStructure: ContentStructure
  sensitivityLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
  language: string
  summary: string
}

export class ContentAnalyzer {
  /**
   * Analyze document content and provide intelligent insights
   */
  static async analyzeContent(text: string, fileName: string): Promise<SmartAnalysis> {
    try {
      console.log(`Starting content analysis for: ${fileName}`)
      
      // Step 1: Document type classification
      const documentType = await this.classifyDocument(text, fileName)
      
      // Step 2: Extract entities
      const extractedEntities = this.extractEntities(text)
      
      // Step 3: Analyze content structure
      const contentStructure = this.analyzeStructure(text)
      
      // Step 4: Detect sensitive content
      const sensitivityLevel = this.detectSensitivity(text, extractedEntities)
      
      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendations(documentType, extractedEntities, sensitivityLevel)
      
      // Step 6: Detect language
      const language = this.detectLanguage(text)
      
      // Step 7: Generate summary
      const summary = this.generateSummary(text, documentType)
      
      return {
        documentType,
        confidence: this.calculateConfidence(text, extractedEntities),
        extractedEntities,
        contentStructure,
        sensitivityLevel,
        recommendations,
        language,
        summary
      }
      
    } catch (error) {
      console.error('Content analysis failed:', error)
      
      // Return fallback analysis
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
        recommendations: ['Content analysis failed. Please review document manually.'],
        language: 'unknown',
        summary: 'Content analysis could not be completed.'
      }
    }
  }
  
  /**
   * Classify document type based on content and filename
   */
  private static async classifyDocument(text: string, fileName: string): Promise<SmartAnalysis['documentType']> {
    const lowerText = text.toLowerCase()
    const lowerFileName = fileName.toLowerCase()
    
    // Resume detection
    if (this.isResume(lowerText, lowerFileName)) {
      return 'resume'
    }
    
    // Contract detection
    if (this.isContract(lowerText, lowerFileName)) {
      return 'contract'
    }
    
    // Invoice detection
    if (this.isInvoice(lowerText, lowerFileName)) {
      return 'invoice'
    }
    
    // Report detection
    if (this.isReport(lowerText, lowerFileName)) {
      return 'report'
    }
    
    // Letter detection
    if (this.isLetter(lowerText, lowerFileName)) {
      return 'letter'
    }
    
    return 'other'
  }
  
  /**
   * Check if document is a resume
   */
  private static isResume(text: string, fileName: string): boolean {
    const resumeKeywords = [
      'resume', 'cv', 'curriculum vitae', 'experience', 'skills', 'education',
      'work history', 'professional summary', 'objective', 'qualifications'
    ]
    
    const hasResumeKeywords = resumeKeywords.some(keyword => text.includes(keyword))
    const hasResumeFileName = /resume|cv|curriculum/i.test(fileName)
    
    return hasResumeKeywords || hasResumeFileName
  }
  
  /**
   * Check if document is a contract
   */
  private static isContract(text: string, fileName: string): boolean {
    const contractKeywords = [
      'agreement', 'contract', 'terms and conditions', 'party', 'effective date',
      'termination', 'liability', 'indemnification', 'governing law'
    ]
    
    const hasContractKeywords = contractKeywords.some(keyword => text.includes(keyword))
    const hasContractFileName = /contract|agreement|terms/i.test(fileName)
    
    return hasContractKeywords || hasContractFileName
  }
  
  /**
   * Check if document is an invoice
   */
  private static isInvoice(text: string, fileName: string): boolean {
    const invoiceKeywords = [
      'invoice', 'bill', 'amount due', 'payment terms', 'subtotal', 'tax',
      'total amount', 'due date', 'payment instructions'
    ]
    
    const hasInvoiceKeywords = invoiceKeywords.some(keyword => text.includes(keyword))
    const hasInvoiceFileName = /invoice|bill|receipt/i.test(fileName)
    
    return hasInvoiceKeywords || hasInvoiceFileName
  }
  
  /**
   * Check if document is a report
   */
  private static isReport(text: string, fileName: string): boolean {
    const reportKeywords = [
      'report', 'analysis', 'findings', 'conclusion', 'recommendations',
      'executive summary', 'methodology', 'results', 'discussion'
    ]
    
    const hasReportKeywords = reportKeywords.some(keyword => text.includes(keyword))
    const hasReportFileName = /report|analysis|study/i.test(fileName)
    
    return hasReportKeywords || hasReportFileName
  }
  
  /**
   * Check if document is a letter
   */
  private static isLetter(text: string, fileName: string): boolean {
    const letterKeywords = [
      'dear', 'sincerely', 'yours truly', 'best regards', 'cc:', 'bcc:',
      're:', 'subject:', 'date:', 'to:', 'from:'
    ]
    
    const hasLetterKeywords = letterKeywords.some(keyword => text.includes(keyword))
    const hasLetterFileName = /letter|correspondence|email/i.test(fileName)
    
    return hasLetterKeywords || hasLetterFileName
  }
  
  /**
   * Extract entities from text content
   */
  private static extractEntities(text: string): ExtractedEntity {
    return {
      dates: this.extractDates(text),
      names: this.extractNames(text),
      amounts: this.extractAmounts(text),
      organizations: this.extractOrganizations(text),
      emails: this.extractEmails(text),
      phoneNumbers: this.extractPhoneNumbers(text),
      addresses: this.extractAddresses(text),
      urls: this.extractUrls(text)
    }
  }
  
  /**
   * Extract dates from text
   */
  private static extractDates(text: string): string[] {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,   // MM-DD-YYYY
      /\b\d{4}-\d{1,2}-\d{1,2}\b/g,     // YYYY-MM-DD
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi, // Month DD, YYYY
    ]
    
    const dates: string[] = []
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        dates.push(...matches)
      }
    })
    
    return [...new Set(dates)] // Remove duplicates
  }
  
  /**
   * Extract names from text (simplified)
   */
  private static extractNames(text: string): string[] {
    // This is a simplified name extraction
    // In production, you'd want to use NLP libraries or AI services
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
    const matches = text.match(namePattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Extract monetary amounts from text
   */
  private static extractAmounts(text: string): number[] {
    const amountPattern = /\$[\d,]+(?:\.\d{2})?|\b\d+(?:\.\d{2})?\s*(?:dollars?|USD)\b/gi
    const matches = text.match(amountPattern) || []
    
    return matches.map(match => {
      const cleanAmount = match.replace(/[$,]/g, '').replace(/\s*(?:dollars?|USD)/i, '')
      return parseFloat(cleanAmount) || 0
    }).filter(amount => amount > 0)
  }
  
  /**
   * Extract organizations from text (simplified)
   */
  private static extractOrganizations(text: string): string[] {
    // This is a simplified organization extraction
    // In production, you'd want to use NLP libraries or AI services
    const orgPattern = /\b[A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Inc|Corp|LLC|Ltd|Company|Organization|Foundation)\b/gi
    const matches = text.match(orgPattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Extract email addresses from text
   */
  private static extractEmails(text: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const matches = text.match(emailPattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Extract phone numbers from text
   */
  private static extractPhoneNumbers(text: string): string[] {
    const phonePattern = /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g
    const matches = text.match(phonePattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Extract addresses from text (simplified)
   */
  private static extractAddresses(text: string): string[] {
    // This is a simplified address extraction
    // In production, you'd want to use specialized address parsing libraries
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/gi
    const matches = text.match(addressPattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Extract URLs from text
   */
  private static extractUrls(text: string): string[] {
    const urlPattern = /\bhttps?:\/\/[^\s]+/gi
    const matches = text.match(urlPattern) || []
    return [...new Set(matches)]
  }
  
  /**
   * Analyze content structure
   */
  private static analyzeStructure(text: string): ContentStructure {
    const lines = text.split('\n')
    const hasHeaders = /^#+\s/.test(text) || /^[A-Z][A-Z\s]+$/.test(text)
    const hasLists = /\n\s*[-*•]\s/.test(text) || /\n\s*\d+\.\s/.test(text)
    const hasTables = /\|.*\|/.test(text) || /\t/.test(text)
    const hasCodeBlocks = /```[\s\S]*```/.test(text)
    
    // Estimate reading time (average 200 words per minute)
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
    const estimatedReadingTime = Math.ceil(wordCount / 200)
    
    // Extract sections (simplified)
    const sections = lines
      .filter(line => /^#+\s/.test(line) || /^[A-Z][A-Z\s]+$/.test(line))
      .map(line => line.replace(/^#+\s/, '').trim())
      .filter(section => section.length > 0)
    
    return {
      sections,
      hasTableOfContents: sections.length > 3,
      estimatedReadingTime,
      hasHeaders,
      hasLists,
      hasTables,
      hasCodeBlocks
    }
  }
  
  /**
   * Detect sensitive content
   */
  private static detectSensitivity(text: string, entities: ExtractedEntity): 'low' | 'medium' | 'high' {
    const sensitivePatterns = [
      /password|secret|confidential|private|restricted/gi,
      /ssn|social security|credit card|bank account/gi,
      /salary|compensation|bonus|commission/gi
    ]
    
    const hasSensitiveContent = sensitivePatterns.some(pattern => pattern.test(text))
    const hasPersonalInfo = entities.emails.length > 0 || entities.phoneNumbers.length > 0 || entities.addresses.length > 0
    const hasFinancialInfo = entities.amounts.length > 0
    
    if (hasSensitiveContent || hasPersonalInfo || hasFinancialInfo) {
      return hasSensitiveContent ? 'high' : 'medium'
    }
    
    return 'low'
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private static generateRecommendations(
    documentType: SmartAnalysis['documentType'],
    entities: ExtractedEntity,
    sensitivity: 'low' | 'medium' | 'high'
  ): string[] {
    const recommendations: string[] = []
    
    // Document type specific recommendations
    switch (documentType) {
      case 'resume':
        recommendations.push('Consider redacting personal contact information for public sharing')
        if (entities.amounts.length > 0) {
          recommendations.push('Salary information detected - consider if this should be shared')
        }
        break
      case 'contract':
        recommendations.push('Legal review recommended before execution')
        recommendations.push('Ensure all parties are properly identified')
        break
      case 'invoice':
        recommendations.push('Verify payment terms and due dates')
        recommendations.push('Check for accuracy of amounts and calculations')
        break
    }
    
    // Sensitivity based recommendations
    if (sensitivity === 'high') {
      recommendations.push('High sensitivity content detected - review sharing permissions')
      recommendations.push('Consider encryption for storage and transmission')
    } else if (sensitivity === 'medium') {
      recommendations.push('Medium sensitivity content - review access controls')
    }
    
    // Entity based recommendations
    if (entities.emails.length > 0) {
      recommendations.push('Email addresses detected - consider privacy implications')
    }
    
    if (entities.phoneNumbers.length > 0) {
      recommendations.push('Phone numbers detected - consider privacy implications')
    }
    
    return recommendations
  }
  
  /**
   * Detect language (simplified)
   */
  private static detectLanguage(text: string): string {
    // This is a simplified language detection
    // In production, you'd want to use specialized language detection libraries
    const englishPattern = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi
    const spanishPattern = /\b(el|la|los|las|y|o|pero|en|con|por|para|de|con)\b/gi
    const frenchPattern = /\b(le|la|les|et|ou|mais|en|avec|par|pour|de|du)\b/gi
    
    const englishMatches = (text.match(englishPattern) || []).length
    const spanishMatches = (text.match(spanishPattern) || []).length
    const frenchMatches = (text.match(frenchPattern) || []).length
    
    if (englishMatches > spanishMatches && englishMatches > frenchMatches) {
      return 'en'
    } else if (spanishMatches > englishMatches && spanishMatches > frenchMatches) {
      return 'es'
    } else if (frenchMatches > englishMatches && frenchMatches > spanishMatches) {
      return 'fr'
    }
    
    return 'en' // Default to English
  }
  
  /**
   * Generate summary
   */
  private static generateSummary(text: string, documentType: SmartAnalysis['documentType']): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
    const firstFewSentences = sentences.slice(0, 3).join('. ')
    
    return `This appears to be a ${documentType} document. ${firstFewSentences}...`
  }
  
  /**
   * Calculate confidence score
   */
  private static calculateConfidence(text: string, entities: ExtractedEntity): number {
    let confidence = 0.5 // Base confidence
    
    // Text quality factors
    if (text.length > 1000) confidence += 0.2
    if (text.length > 5000) confidence += 0.1
    
    // Entity richness factors
    if (entities.dates.length > 0) confidence += 0.1
    if (entities.names.length > 0) confidence += 0.1
    if (entities.organizations.length > 0) confidence += 0.1
    
    // Cap at 1.0
    return Math.min(confidence, 1.0)
  }
}
