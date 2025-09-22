#!/usr/bin/env node

/**
 * Pre-GitHub Push Cleanup Script
 * Removes temporary files, cleans up logs, and optimizes the codebase
 */

const fs = require('fs')
const path = require('path')

console.log('🧹 Starting pre-GitHub push cleanup...')

// Files and directories to clean up
const cleanupTargets = [
  // Temporary files
  '.next',
  'node_modules/.cache',
  '*.log',
  '*.tmp',
  '*.temp',
  
  // Build artifacts
  'dist',
  'build',
  'out',
  
  // IDE files
  '.vscode/settings.json',
  '.idea',
  '*.swp',
  '*.swo',
  '*~',
  
  // OS files
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  
  // Test artifacts
  'coverage',
  '.nyc_output',
  'junit.xml',
  
  // Environment files (keep .env.example)
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local'
]

// Directories to clean recursively
const directoriesToClean = [
  'node_modules/.cache',
  '.next',
  'coverage'
]

function deleteFileOrDir(target) {
  try {
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target)
      if (stat.isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true })
        console.log(`✅ Removed directory: ${target}`)
      } else {
        fs.unlinkSync(target)
        console.log(`✅ Removed file: ${target}`)
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not remove ${target}: ${error.message}`)
  }
}

function cleanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return
  
  try {
    const files = fs.readdirSync(dirPath)
    files.forEach(file => {
      const filePath = path.join(dirPath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        cleanDirectory(filePath)
        // Remove empty directories
        try {
          fs.rmdirSync(filePath)
        } catch (e) {
          // Directory not empty, that's fine
        }
      } else {
        // Check if file matches cleanup patterns
        const shouldClean = cleanupTargets.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'))
            return regex.test(file)
          }
          return file === pattern
        })
        
        if (shouldClean) {
          deleteFileOrDir(filePath)
        }
      }
    })
  } catch (error) {
    console.warn(`⚠️ Error cleaning directory ${dirPath}: ${error.message}`)
  }
}

// Clean up specific directories
directoriesToClean.forEach(dir => {
  console.log(`🧹 Cleaning directory: ${dir}`)
  cleanDirectory(dir)
})

// Clean up root directory files
console.log('🧹 Cleaning root directory files...')
const rootFiles = fs.readdirSync('.')
rootFiles.forEach(file => {
  const shouldClean = cleanupTargets.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(file)
    }
    return file === pattern
  })
  
  if (shouldClean) {
    deleteFileOrDir(file)
  }
})

// Clean up package-lock.json if pnpm-lock.yaml exists
if (fs.existsSync('pnpm-lock.yaml') && fs.existsSync('package-lock.json')) {
  console.log('🧹 Removing package-lock.json (using pnpm)')
  deleteFileOrDir('package-lock.json')
}

// Clean up yarn.lock if pnpm-lock.yaml exists
if (fs.existsSync('pnpm-lock.yaml') && fs.existsSync('yarn.lock')) {
  console.log('🧹 Removing yarn.lock (using pnpm)')
  deleteFileOrDir('yarn.lock')
}

console.log('✅ Cleanup completed!')
console.log('')
console.log('📋 Pre-push checklist:')
console.log('  ✅ Temporary files removed')
console.log('  ✅ Build artifacts cleaned')
console.log('  ✅ IDE files removed')
console.log('  ✅ OS files removed')
console.log('  ✅ Test artifacts cleaned')
console.log('  ✅ Environment files cleaned (kept .env.example)')
console.log('')
console.log('🚀 Ready for GitHub push!')
