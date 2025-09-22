import { SmartParser } from './index'
import { EnhancedPDFProcessor } from './pdfProcessor'
import { ContentAnalyzer } from './contentAnalyzer'
import { SecurityScanner } from './securityScanner'

/**
 * Test suite for Smart Parser components
 */
export class SmartParserTests {
  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    const results: any[] = []
    let passed = 0
    let failed = 0
    
    console.log('🧪 Starting Smart Parser tests...\n')
    
    // Test 1: Component validation
    const validationTest = await this.testComponentValidation()
    results.push(validationTest)
    if (validationTest.passed) passed++; else failed++
    
    // Test 2: Content analyzer
    const contentTest = await this.testContentAnalyzer()
    results.push(contentTest)
    if (contentTest.passed) passed++; else failed++
    
    // Test 3: Security scanner
    const securityTest = await this.testSecurityScanner()
    results.push(securityTest)
    if (securityTest.passed) passed++; else failed++
    
    // Test 4: Smart Parser integration
    const integrationTest = await this.testSmartParserIntegration()
    results.push(integrationTest)
    if (integrationTest.passed) passed++; else failed++
    
    // Test 5: PDF processor (basic)
    const pdfTest = await this.testPDFProcessor()
    results.push(pdfTest)
    if (pdfTest.passed) passed++; else failed++
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
    
    return { passed, failed, results }
  }
  
  /**
   * Test component validation
   */
  private static async testComponentValidation(): Promise<{ name: string; passed: boolean; details: any }> {
    console.log('🔍 Testing component validation...')
    
    try {
      const validation = SmartParser.validateComponents()
      const passed = validation.valid
      
      console.log(`   ✅ Component validation: ${passed ? 'PASSED' : 'FAILED'}`)
      if (!passed) {
        console.log(`   ❌ Issues: ${validation.issues.join(', ')}`)
      }
      
      return {
        name: 'Component Validation',
        passed,
        details: validation
      }
    } catch (error) {
      console.log(`   ❌ Component validation test failed: ${error}`)
      return {
        name: 'Component Validation',
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * Test content analyzer
   */
  private static async testContentAnalyzer(): Promise<{ name: string; passed: boolean; details: any }> {
    console.log('📄 Testing content analyzer...')
    
    try {
      const testText = `
        John Smith
        Software Engineer
        Experience: 5 years
        Skills: JavaScript, TypeScript, React
        Email: john.smith@example.com
        Phone: (555) 123-4567
        Salary: $85,000
      `
      
      const analysis = await ContentAnalyzer.analyzeContent(testText, 'resume.txt')
      const passed = analysis.documentType === 'resume' && analysis.confidence > 0.5
      
      console.log(`   ✅ Content analysis: ${passed ? 'PASSED' : 'FAILED'}`)
      console.log(`   📋 Document type: ${analysis.documentType}, Confidence: ${analysis.confidence}`)
      
      return {
        name: 'Content Analyzer',
        passed,
        details: analysis
      }
    } catch (error) {
      console.log(`   ❌ Content analyzer test failed: ${error}`)
      return {
        name: 'Content Analyzer',
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * Test security scanner
   */
  private static async testSecurityScanner(): Promise<{ name: string; passed: boolean; details: any }> {
    console.log('🔒 Testing security scanner...')
    
    try {
      const testText = `
        Credit Card: 1234-5678-9012-3456
        SSN: 123-45-6789
        Email: user@example.com
        Phone: (555) 987-6543
        Salary: $75,000
      `
      
      const scan = await SecurityScanner.scanDocument(testText, 'sensitive.txt')
      const passed = scan.piiDetected && scan.riskLevel === 'critical'
      
      console.log(`   ✅ Security scan: ${passed ? 'PASSED' : 'FAILED'}`)
      console.log(`   🚨 Risk level: ${scan.riskLevel}, PII detected: ${scan.piiDetected}`)
      
      return {
        name: 'Security Scanner',
        passed,
        details: scan
      }
    } catch (error) {
      console.log(`   ❌ Security scanner test failed: ${error}`)
      return {
        name: 'Security Scanner',
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * Test Smart Parser integration
   */
  private static async testSmartParserIntegration(): Promise<{ name: string; passed: boolean; details: any }> {
    console.log('🔗 Testing Smart Parser integration...')
    
    try {
      const testBuffer = Buffer.from(`
        This is a test document for the Smart Parser.
        It contains some basic text content.
        Date: 2024-01-15
        Author: Test User
        Email: test@example.com
      `)
      
      const result = await SmartParser.parseDocument(
        testBuffer,
        'test.txt',
        'text/plain',
        {
          enableContentAnalysis: true,
          enableSecurityScan: true,
          enableOCR: false
        }
      )
      
      const passed = !result.hasErrors && result.text.length > 0
      
      console.log(`   ✅ Smart Parser integration: ${passed ? 'PASSED' : 'FAILED'}`)
      console.log(`   📊 Processing time: ${result.processingTime}ms`)
      console.log(`   🎯 Capabilities: ${result.capabilities.length} enabled`)
      
      return {
        name: 'Smart Parser Integration',
        passed,
        details: result
      }
    } catch (error) {
      console.log(`   ❌ Smart Parser integration test failed: ${error}`)
      return {
        name: 'Smart Parser Integration',
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * Test PDF processor (basic functionality)
   */
  private static async testPDFProcessor(): Promise<{ name: string; passed: boolean; details: any }> {
    console.log('📄 Testing PDF processor...')
    
    try {
      // Create a simple PDF-like buffer for testing
      const testBuffer = Buffer.from('PDF test content')
      
      const stats = EnhancedPDFProcessor.getProcessingStats()
      const passed = stats.version === '2.0.0' && stats.capabilities.length > 0
      
      console.log(`   ✅ PDF processor: ${passed ? 'PASSED' : 'FAILED'}`)
      console.log(`   📋 Version: ${stats.version}`)
      console.log(`   🚀 Capabilities: ${stats.capabilities.length} available`)
      
      return {
        name: 'PDF Processor',
        passed,
        details: stats
      }
    } catch (error) {
      console.log(`   ❌ PDF processor test failed: ${error}`)
      return {
        name: 'PDF Processor',
        passed: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * Get test summary
   */
  static getTestSummary(): { total: number; features: string[] } {
    return {
      total: 5,
      features: [
        'Component validation',
        'Content analysis',
        'Security scanning',
        'Smart Parser integration',
        'PDF processing'
      ]
    }
  }
}

// Export for use in other files
export default SmartParserTests
