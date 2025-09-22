export interface SecurityScanResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  detectedThreats: string[]
  piiDetected: boolean
  sensitivePatterns: string[]
  recommendations: string[]
  complianceIssues: string[]
  encryptionRecommended: boolean
  accessControlLevel: 'public' | 'internal' | 'restricted' | 'confidential'
}

export interface ComplianceCheck {
  gdpr: boolean
  hipaa: boolean
  sox: boolean
  pci: boolean
  violations: string[]
}

export class SecurityScanner {
  private static readonly PII_PATTERNS = {
    // Social Security Numbers
    ssn: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
    
    // Credit Card Numbers
    creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    
    // Bank Account Numbers
    bankAccount: /\b\d{8,17}\b/g,
    
    // Phone Numbers
    phone: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
    
    // Email Addresses
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // IP Addresses
    ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    
    // MAC Addresses
    macAddress: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    
    // Driver's License
    driversLicense: /\b[A-Z]\d{7}\b|\b\d{7}[A-Z]\b/g,
    
    // Passport Numbers
    passport: /\b[A-Z]\d{8}\b|\b\d{9}\b/g
  }
  
  private static readonly SENSITIVE_KEYWORDS = {
    critical: [
      'password', 'secret', 'confidential', 'classified', 'top secret',
      'restricted', 'private', 'internal use only', 'for your eyes only'
    ],
    high: [
      'salary', 'compensation', 'bonus', 'commission', 'revenue', 'profit',
      'bank account', 'routing number', 'swift code', 'iban'
    ],
    medium: [
      'contract', 'agreement', 'terms', 'legal', 'attorney', 'lawyer',
      'medical', 'health', 'diagnosis', 'treatment', 'prescription'
    ]
  }
  
  private static readonly COMPLIANCE_PATTERNS = {
    gdpr: [
      'personal data', 'data subject', 'data controller', 'data processor',
      'right to be forgotten', 'data portability', 'consent'
    ],
    hipaa: [
      'protected health information', 'phi', 'medical record', 'diagnosis',
      'treatment', 'prescription', 'healthcare provider'
    ],
    sox: [
      'financial statement', 'audit', 'internal control', 'disclosure',
      'material weakness', 'significant deficiency'
    ],
    pci: [
      'credit card', 'cardholder data', 'payment card', 'cvv', 'cvc',
      'expiration date', 'magnetic stripe'
    ]
  }
  
  /**
   * Perform comprehensive security scan on document content
   */
  static async scanDocument(text: string, fileName: string): Promise<SecurityScanResult> {
    try {
      console.log(`Starting security scan for: ${fileName}`)
      
      // Step 1: Scan for PII
      const piiDetected = this.scanForPII(text)
      
      // Step 2: Scan for sensitive keywords
      const sensitivePatterns = this.scanForSensitiveKeywords(text)
      
      // Step 3: Check compliance requirements
      const complianceIssues = this.checkCompliance(text)
      
      // Step 4: Determine risk level
      const riskLevel = this.calculateRiskLevel(piiDetected, sensitivePatterns, complianceIssues)
      
      // Step 5: Generate recommendations
      const recommendations = this.generateSecurityRecommendations(riskLevel, piiDetected, sensitivePatterns, complianceIssues)
      
      // Step 6: Determine access control level
      const accessControlLevel = this.determineAccessControlLevel(riskLevel, piiDetected)
      
      // Step 7: Check if encryption is recommended
      const encryptionRecommended = this.isEncryptionRecommended(riskLevel, piiDetected)
      
      return {
        riskLevel,
        detectedThreats: this.detectThreats(text),
        piiDetected,
        sensitivePatterns,
        recommendations,
        complianceIssues,
        encryptionRecommended,
        accessControlLevel
      }
      
    } catch (error) {
      console.error('Security scan failed:', error)
      
      // Return high-risk fallback result
      return {
        riskLevel: 'high',
        detectedThreats: ['Security scan failed'],
        piiDetected: true, // Assume worst case
        sensitivePatterns: ['Unknown'],
        recommendations: ['Security scan failed. Treat document as high-risk until manually reviewed.'],
        complianceIssues: ['Unable to determine compliance requirements'],
        encryptionRecommended: true,
        accessControlLevel: 'confidential'
      }
    }
  }
  
  /**
   * Scan for Personally Identifiable Information
   */
  private static scanForPII(text: string): boolean {
    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      if (pattern.test(text)) {
        console.log(`PII detected: ${type}`)
        return true
      }
    }
    return false
  }
  
  /**
   * Scan for sensitive keywords and patterns
   */
  private static scanForSensitiveKeywords(text: string): string[] {
    const detected: string[] = []
    const lowerText = text.toLowerCase()
    
    for (const [level, keywords] of Object.entries(this.SENSITIVE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          detected.push(`${level}: ${keyword}`)
        }
      }
    }
    
    return detected
  }
  
  /**
   * Check compliance requirements
   */
  private static checkCompliance(text: string): string[] {
    const issues: string[] = []
    const lowerText = text.toLowerCase()
    
    for (const [standard, patterns] of Object.entries(this.COMPLIANCE_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          issues.push(`${standard.toUpperCase()}: ${pattern}`)
        }
      }
    }
    
    return issues
  }
  
  /**
   * Calculate overall risk level
   */
  private static calculateRiskLevel(
    piiDetected: boolean,
    sensitivePatterns: string[],
    complianceIssues: string[]
  ): SecurityScanResult['riskLevel'] {
    let riskScore = 0
    
    // PII detection adds significant risk
    if (piiDetected) riskScore += 3
    
    // Sensitive patterns add risk based on level
    for (const pattern of sensitivePatterns) {
      if (pattern.startsWith('critical:')) riskScore += 3
      else if (pattern.startsWith('high:')) riskScore += 2
      else if (pattern.startsWith('medium:')) riskScore += 1
    }
    
    // Compliance issues add risk
    riskScore += complianceIssues.length
    
    // Determine risk level
    if (riskScore >= 6) return 'critical'
    if (riskScore >= 4) return 'high'
    if (riskScore >= 2) return 'medium'
    return 'low'
  }
  
  /**
   * Detect potential security threats
   */
  private static detectThreats(text: string): string[] {
    const threats: string[] = []
    
    // Check for potential SQL injection patterns
    if (/\b(union|select|insert|update|delete|drop|create|alter)\b/i.test(text)) {
      threats.push('Potential SQL injection patterns detected')
    }
    
    // Check for potential XSS patterns
    if (/<script|javascript:|vbscript:|onload=|onerror=/i.test(text)) {
      threats.push('Potential XSS patterns detected')
    }
    
    // Check for potential command injection
    if (/\b(cmd|exec|system|eval|shell)\b/i.test(text)) {
      threats.push('Potential command injection patterns detected')
    }
    
    // Check for suspicious file extensions
    if (/\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|msi|dll|sys)\b/i.test(text)) {
      threats.push('Suspicious file extensions detected')
    }
    
    return threats
  }
  
  /**
   * Generate security recommendations
   */
  private static generateSecurityRecommendations(
    riskLevel: SecurityScanResult['riskLevel'],
    piiDetected: boolean,
    sensitivePatterns: string[],
    complianceIssues: string[]
  ): string[] {
    const recommendations: string[] = []
    
    // Risk level based recommendations
    switch (riskLevel) {
      case 'critical':
        recommendations.push('Document requires immediate security review')
        recommendations.push('Implement strict access controls')
        recommendations.push('Consider encryption at rest and in transit')
        recommendations.push('Audit all access to this document')
        break
      case 'high':
        recommendations.push('Document requires elevated security measures')
        recommendations.push('Limit access to authorized personnel only')
        recommendations.push('Consider encryption for storage')
        break
      case 'medium':
        recommendations.push('Document requires standard security measures')
        recommendations.push('Review access permissions')
        break
      case 'low':
        recommendations.push('Document meets standard security requirements')
        break
    }
    
    // PII specific recommendations
    if (piiDetected) {
      recommendations.push('PII detected - implement data minimization')
      recommendations.push('Ensure compliance with privacy regulations')
      recommendations.push('Consider data anonymization or pseudonymization')
    }
    
    // Compliance specific recommendations
    if (complianceIssues.length > 0) {
      recommendations.push('Compliance issues detected - review regulatory requirements')
      recommendations.push('Consult with legal/compliance team')
      recommendations.push('Implement required safeguards and controls')
    }
    
    // General security recommendations
    recommendations.push('Regular security audits recommended')
    recommendations.push('Monitor access logs for suspicious activity')
    
    return recommendations
  }
  
  /**
   * Determine appropriate access control level
   */
  private static determineAccessControlLevel(
    riskLevel: SecurityScanResult['riskLevel'],
    piiDetected: boolean
  ): SecurityScanResult['accessControlLevel'] {
    if (riskLevel === 'critical' || piiDetected) {
      return 'confidential'
    } else if (riskLevel === 'high') {
      return 'restricted'
    } else if (riskLevel === 'medium') {
      return 'internal'
    } else {
      return 'public'
    }
  }
  
  /**
   * Determine if encryption is recommended
   */
  private static isEncryptionRecommended(
    riskLevel: SecurityScanResult['riskLevel'],
    piiDetected: boolean
  ): boolean {
    return riskLevel === 'critical' || riskLevel === 'high' || piiDetected
  }
  
  /**
   * Get security scan statistics
   */
  static getScanStats(): { version: string; capabilities: string[] } {
    return {
      version: '1.0.0',
      capabilities: [
        'PII detection (SSN, credit cards, emails, etc.)',
        'Sensitive keyword scanning',
        'Compliance requirement checking (GDPR, HIPAA, SOX, PCI)',
        'Threat pattern detection',
        'Risk level assessment',
        'Security recommendations',
        'Access control level determination',
        'Encryption recommendations'
      ]
    }
  }
  
  /**
   * Validate security scan configuration
   */
  static validateConfiguration(): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Check if patterns are properly configured
    if (Object.keys(this.PII_PATTERNS).length === 0) {
      issues.push('PII patterns not configured')
    }
    
    if (Object.keys(this.SENSITIVE_KEYWORDS).length === 0) {
      issues.push('Sensitive keywords not configured')
    }
    
    if (Object.keys(this.COMPLIANCE_PATTERNS).length === 0) {
      issues.push('Compliance patterns not configured')
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}
