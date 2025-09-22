#!/usr/bin/env node

/**
 * Test Fixed PDF Parser
 */

const path = require('path')
const fs = require('fs')

// Test PDF file path
const TEST_PDF_PATH = path.join(__dirname, '..', '8.25.25IPanalysis.md.pdf')

async function testFixedParser() {
  try {
    console.log('🧪 Testing Fixed PDF Parser...')
    console.log(`📄 Test file: ${TEST_PDF_PATH}`)
    
    // Load test PDF
    if (!fs.existsSync(TEST_PDF_PATH)) {
      throw new Error(`Test PDF not found at: ${TEST_PDF_PATH}`)
    }
    
    const buffer = fs.readFileSync(TEST_PDF_PATH)
    console.log(`📊 File size: ${buffer.length} bytes`)
    
    // Import and test the fixed parser
    const { FixedPDFParser } = require('../lib/fixed-pdf-parser.js')
    
    console.log('\n🔍 Testing Fixed PDF Parser...')
    const startTime = Date.now()
    
    const result = await FixedPDFParser.parsePDF(buffer)
    const totalTime = Date.now() - startTime
    
    console.log('\n📊 Results:')
    console.log(`✅ Success: ${!result.hasErrors}`)
    console.log(`📏 Text length: ${result.text.length}`)
    console.log(`📊 Word count: ${result.wordCount}`)
    console.log(`📄 Pages: ${result.pages}`)
    console.log(`⏱️ Processing time: ${result.processingTime}ms`)
    console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`🔧 Method: ${result.processingMethod}`)
    
    if (result.hasErrors) {
      console.log(`❌ Errors: ${result.errors?.join(', ')}`)
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${result.warnings.join(', ')}`)
    }
    
    console.log(`\n📄 Text Sample (first 300 chars):`)
    console.log('=' .repeat(50))
    console.log(result.text.substring(0, 300) + (result.text.length > 300 ? '...' : ''))
    console.log('=' .repeat(50))
    
    // Test the testParser method too
    console.log('\n🧪 Testing testParser method...')
    const testResult = await FixedPDFParser.testParser(buffer)
    
    console.log(`✅ Test success: ${testResult.success}`)
    console.log(`📊 Test word count: ${testResult.wordCount}`)
    console.log(`🎯 Test confidence: ${(testResult.confidence * 100).toFixed(1)}%`)
    console.log(`⏱️ Test processing time: ${testResult.processingTime}ms`)
    
    console.log(`\n📄 Test text sample:`)
    console.log(testResult.textSample)
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      testFile: TEST_PDF_PATH,
      fileSize: buffer.length,
      fullResult: result,
      testResult: testResult,
      totalTestTime: totalTime
    }
    
    const resultsPath = path.join(__dirname, '..', 'fixed-parser-test-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
    
    console.log(`\n📄 Full results saved to: ${resultsPath}`)
    
    if (!result.hasErrors && result.confidence > 0.8) {
      console.log('\n🎉 SUCCESS! Fixed PDF Parser is working correctly!')
      console.log('✅ Ready to integrate into VoiceLoop HR platform')
    } else {
      console.log('\n⚠️ Issues detected. Review results above.')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

testFixedParser()
