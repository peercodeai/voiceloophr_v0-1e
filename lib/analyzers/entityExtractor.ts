export interface ExtractedEntity {
  dates: string[]
  names: string[]
  amounts: number[]
  organizations: string[]
  emails: string[]
  phoneNumbers: string[]
  addresses: string[]
  urls: string[]
  socialSecurityNumbers: string[]
  creditCardNumbers: string[]
  ipAddresses: string[]
}

export interface EntityConfidence {
  entity: string
  confidence: number
  context: string
}

export class EntityExtractor {
  /**
   * Extract all entities from text
   */
  static extractEntities(text: string): ExtractedEntity {
    return {
      dates: this.extractDates(text),
      names: this.extractNames(text),
      amounts: this.extractAmounts(text),
      organizations: this.extractOrganizations(text),
      emails: this.extractEmails(text),
      phoneNumbers: this.extractPhoneNumbers(text),
      addresses: this.extractAddresses(text),
      urls: this.extractUrls(text),
      socialSecurityNumbers: this.extractSocialSecurityNumbers(text),
      creditCardNumbers: this.extractCreditCardNumbers(text),
      ipAddresses: this.extractIpAddresses(text)
    }
  }

  /**
   * Extract dates from text
   */
  static extractDates(text: string): string[] {
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
      // YYYY-MM-DD
      /\b(19|20)\d{2}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g,
      // Month DD, YYYY
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
      // DD Month YYYY
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:19|20)\d{2}\b/gi
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
   * Extract names from text
   */
  static extractNames(text: string): string[] {
    // Pattern for capitalized words that could be names
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    const matches = text.match(namePattern) || []
    
    // Filter out common non-name words
    const commonWords = [
      'The', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'By',
      'This', 'That', 'These', 'Those', 'Is', 'Are', 'Was', 'Were', 'Will', 'Would',
      'Could', 'Should', 'May', 'Might', 'Can', 'Must', 'Shall'
    ]
    
    return matches.filter(name => 
      name.length > 2 && 
      !commonWords.includes(name) &&
      !this.isDate(name) &&
      !this.isAmount(name)
    )
  }

  /**
   * Extract monetary amounts from text
   */
  static extractAmounts(text: string): number[] {
    const amountPatterns = [
      // $X.XX or $X,XXX.XX
      /\$\s*[\d,]+\.?\d*/g,
      // X.XX USD or X,XXX.XX USD
      /\b[\d,]+\.?\d*\s*(?:USD|dollars?|cents?)\b/gi,
      // X.XX% or X%
      /\b[\d,]+\.?\d*%\b/g
    ]
    
    const amounts: number[] = []
    
    amountPatterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      matches.forEach(match => {
        const cleanAmount = match.replace(/[$,%]/g, '').replace(/\s+[A-Za-z]+$/, '')
        const amount = parseFloat(cleanAmount)
        if (!isNaN(amount)) {
          amounts.push(amount)
        }
      })
    })
    
    return amounts
  }

  /**
   * Extract organization names from text
   */
  static extractOrganizations(text: string): string[] {
    const orgPatterns = [
      // Inc., Corp., LLC, Ltd., etc.
      /\b[A-Z][A-Za-z\s&]+(?:Inc|Corp|LLC|Ltd|Company|Co|Organization|Org|Foundation|Foundation|Institute|Institute|University|University|College|College|Hospital|Hospital|Bank|Bank|Insurance|Insurance)\b/g,
      // Government agencies
      /\b[A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Office|Commission|Council|Committee|Board|Authority|Service|Administration)\b/g
    ]
    
    const organizations: string[] = []
    
    orgPatterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      organizations.push(...matches)
    })
    
    return [...new Set(organizations)]
  }

  /**
   * Extract email addresses from text
   */
  static extractEmails(text: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const matches = text.match(emailPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Extract phone numbers from text
   */
  static extractPhoneNumbers(text: string): string[] {
    const phonePatterns = [
      // (XXX) XXX-XXXX
      /\(\d{3}\)\s*\d{3}-\d{4}/g,
      // XXX-XXX-XXXX
      /\d{3}-\d{3}-\d{4}/g,
      // XXX.XXX.XXXX
      /\d{3}\.\d{3}\.\d{4}/g,
      // XXXXXXXXXX (10 digits)
      /\b\d{10}\b/g
    ]
    
    const phoneNumbers: string[] = []
    
    phonePatterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      phoneNumbers.push(...matches)
    })
    
    return [...new Set(phoneNumbers)]
  }

  /**
   * Extract addresses from text
   */
  static extractAddresses(text: string): string[] {
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Way|Terrace|Ter)\b/gi
    const matches = text.match(addressPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Extract URLs from text
   */
  static extractUrls(text: string): string[] {
    const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    const matches = text.match(urlPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Extract social security numbers from text
   */
  static extractSocialSecurityNumbers(text: string): string[] {
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g
    const matches = text.match(ssnPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Extract credit card numbers from text
   */
  static extractCreditCardNumbers(text: string): string[] {
    const ccPattern = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g
    const matches = text.match(ccPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Extract IP addresses from text
   */
  static extractIpAddresses(text: string): string[] {
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g
    const matches = text.match(ipPattern) || []
    return [...new Set(matches)]
  }

  /**
   * Check if a string looks like a date
   */
  private static isDate(str: string): boolean {
    return /\d/.test(str) && /[\/\-]/.test(str)
  }

  /**
   * Check if a string looks like an amount
   */
  private static isAmount(str: string): boolean {
    return /\$/.test(str) || /%/.test(str) || /\d+\.\d+/.test(str)
  }

  /**
   * Get entity confidence scores
   */
  static getEntityConfidence(entities: ExtractedEntity): EntityConfidence[] {
    const confidence: EntityConfidence[] = []
    
    Object.entries(entities).forEach(([entityType, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        confidence.push({
          entity: entityType,
          confidence: Math.min(0.95, 0.7 + (values.length * 0.05)),
          context: `${values.length} ${entityType} found`
        })
      }
    })
    
    return confidence.sort((a, b) => b.confidence - a.confidence)
  }
}
