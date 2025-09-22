#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Sensitive patterns to scan for
const sensitivePatterns = [
  // API Keys
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI API Key', severity: 'HIGH' },
  { pattern: /pk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI Public Key', severity: 'MEDIUM' },
  
  // AWS Credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID', severity: 'HIGH' },
  { pattern: /[0-9a-zA-Z/+]{40}/g, name: 'AWS Secret Access Key', severity: 'HIGH' },
  
  // Generic API Keys
  { pattern: /api[_-]?key[_-]?[=:]\s*['"`]?[a-zA-Z0-9]{20,}['"`]?/gi, name: 'Generic API Key', severity: 'HIGH' },
  { pattern: /secret[_-]?[=:]\s*['"`]?[a-zA-Z0-9]{20,}['"`]?/gi, name: 'Generic Secret', severity: 'HIGH' },
  
  // Database URLs
  { pattern: /mongodb[+srv]?:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, name: 'Database URL with Credentials', severity: 'HIGH' },
  { pattern: /postgresql:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, name: 'PostgreSQL URL with Credentials', severity: 'HIGH' },
  { pattern: /mysql:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, name: 'MySQL URL with Credentials', severity: 'HIGH' },
  
  // JWT Tokens
  { pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, name: 'JWT Token', severity: 'MEDIUM' },
  
  // Private Keys
  { pattern: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, name: 'Private Key', severity: 'HIGH' },
  { pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g, name: 'RSA Private Key', severity: 'HIGH' },
  
  // Environment Variables
  { pattern: /process\.env\.[A-Z_]+/g, name: 'Environment Variable Reference', severity: 'LOW' },
  
  // Hardcoded URLs
  { pattern: /https?:\/\/[^\s]+\.(amazonaws|vercel|netlify|heroku)\.com/g, name: 'Cloud Service URL', severity: 'LOW' },
  
  // IP Addresses
  { pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, name: 'IP Address', severity: 'LOW' },
  
  // Email Addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, name: 'Email Address', severity: 'LOW' },
  
  // Phone Numbers
  { pattern: /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, name: 'Phone Number', severity: 'LOW' }
];

// Files and directories to exclude from scanning
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /\.vercel/,
  /dist/,
  /build/,
  /coverage/,
  /\.env\.local/,
  /\.env\.example/,
  /package-lock\.json/,
  /pnpm-lock\.yaml/,
  /yarn\.lock/,
  /\.DS_Store/,
  /Thumbs\.db/
];

// File extensions to scan
const scanExtensions = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.env'
];

let totalIssues = 0;
let highSeverityIssues = 0;
let mediumSeverityIssues = 0;
let lowSeverityIssues = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    let fileIssues = 0;
    
    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        fileIssues++;
        totalIssues++;
        
        // Count by severity
        switch (pattern.severity) {
          case 'HIGH':
            highSeverityIssues++;
            break;
          case 'MEDIUM':
            mediumSeverityIssues++;
            break;
          case 'LOW':
            lowSeverityIssues++;
            break;
        }
        
        // Show first few matches (truncated for security)
        const displayMatches = matches.slice(0, 3).map(match => {
          if (match.length > 20) {
            return match.substring(0, 10) + '...' + match.substring(match.length - 10);
          }
          return match;
        });
        
        const severityColor = pattern.severity === 'HIGH' ? 'red' : 
                             pattern.severity === 'MEDIUM' ? 'yellow' : 'blue';
        
        log(`  ${colors[severityColor]}${pattern.severity}${colors.reset}: ${pattern.name}`, severityColor);
        log(`    Found ${matches.length} occurrence(s): ${displayMatches.join(', ')}`);
        
        if (matches.length > 3) {
          log(`    ... and ${matches.length - 3} more`);
        }
      }
    }
    
    if (fileIssues > 0) {
      log(`\n${colors.bold}${relativePath}${colors.reset} - ${fileIssues} issue(s) found`);
    }
    
    return fileIssues;
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'red');
    return 0;
  }
}

function shouldScanFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check exclude patterns
  for (const pattern of excludePatterns) {
    if (pattern.test(relativePath)) {
      return false;
    }
  }
  
  // Check file extensions
  const ext = path.extname(filePath).toLowerCase();
  return scanExtensions.includes(ext);
}

function scanDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && shouldScanFile(fullPath)) {
      scanFile(fullPath);
    }
  }
}

function generateReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🔒 SECURITY SCAN REPORT', 'bold');
  log('='.repeat(60), 'cyan');
  
  log(`\n📊 Summary:`, 'bold');
  log(`  Total Issues Found: ${totalIssues}`, totalIssues > 0 ? 'red' : 'green');
  log(`  High Severity: ${highSeverityIssues}`, highSeverityIssues > 0 ? 'red' : 'green');
  log(`  Medium Severity: ${mediumSeverityIssues}`, mediumSeverityIssues > 0 ? 'yellow' : 'green');
  log(`  Low Severity: ${lowSeverityIssues}`, lowSeverityIssues > 0 ? 'blue' : 'green');
  
  if (totalIssues === 0) {
    log('\n✅ No security issues found! Safe to push to GitHub.', 'green');
    return true;
  }
  
  if (highSeverityIssues > 0) {
    log('\n🚨 CRITICAL: High severity issues found!', 'red');
    log('   DO NOT push to GitHub until these are resolved.', 'red');
    log('   Check for API keys, credentials, and secrets.', 'red');
  }
  
  if (mediumSeverityIssues > 0) {
    log('\n⚠️  WARNING: Medium severity issues found!', 'yellow');
    log('   Review these before pushing to GitHub.', 'yellow');
  }
  
  if (lowSeverityIssues > 0) {
    log('\nℹ️  INFO: Low severity issues found.', 'blue');
    log('   These are generally safe but worth reviewing.', 'blue');
  }
  
  log('\n🔧 Recommendations:', 'bold');
  log('  1. Remove or redact all API keys and secrets', 'red');
  log('  2. Use environment variables for sensitive data', 'yellow');
  log('  3. Add sensitive files to .gitignore', 'yellow');
  log('  4. Review .env files and remove from tracking', 'yellow');
  
  return highSeverityIssues === 0;
}

// Main execution
function main() {
  log('🔒 Starting security scan...', 'cyan');
  log('Scanning for sensitive information...\n', 'cyan');
  
  const startTime = Date.now();
  
  try {
    scanDirectory(process.cwd());
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n⏱️  Scan completed in ${duration}s`, 'cyan');
    
    const isSafe = generateReport();
    
    if (!isSafe) {
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Scan failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the scan
main();
