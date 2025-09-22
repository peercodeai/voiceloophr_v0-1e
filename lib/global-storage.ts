// Global storage utility to ensure consistent file storage across API routes
import { GlobalFileData } from './types'

declare global {
  var uploadedFiles: Map<string, GlobalFileData>
}

export function initializeGlobalStorage() {
  if (!global.uploadedFiles) {
    global.uploadedFiles = new Map()
    console.log('🔧 Global storage initialized')
  }
  return global.uploadedFiles
}

export function getGlobalStorage() {
  // Always initialize once and return the shared map
  return initializeGlobalStorage()
}

export function setFileInGlobalStorage(fileId: string, fileData: GlobalFileData) {
  const storage = initializeGlobalStorage()
  storage.set(fileId, fileData)
  console.log(`✅ File stored in global memory: ${fileId} (${fileData.name})`)
  console.log(`📊 Total files in global storage: ${storage.size}`)
}

export function getFileFromGlobalStorage(fileId: string) {
  const storage = getGlobalStorage()
  return storage.get(fileId)
}

export function clearGlobalStorage() {
  const storage = getGlobalStorage()
  storage.clear()
  console.log('🧹 Global storage cleared')
}

export function clearUserFilesFromGlobalStorage(userId: string) {
  const storage = getGlobalStorage()
  let clearedCount = 0
  
  for (const [fileId, fileData] of storage.entries()) {
    if (fileData.userId === userId) {
      storage.delete(fileId)
      clearedCount++
    }
  }
  
  console.log(`🧹 Cleared ${clearedCount} files for user ${userId} from global storage`)
}

// Memory management functions
export function getStorageStats() {
  const storage = getGlobalStorage()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  
  let totalSize = 0
  let oldFiles = 0
  let userFiles = new Map<string, number>()
  
  for (const [fileId, fileData] of storage.entries()) {
    // Calculate approximate size
    totalSize += fileData.buffer.length + JSON.stringify(fileData.metadata).length
    
    // Count files older than 1 hour
    const fileAge = now - new Date(fileData.uploadedAt).getTime()
    if (fileAge > oneHour) {
      oldFiles++
    }
    
    // Count files per user
    if (fileData.userId) {
      userFiles.set(fileData.userId, (userFiles.get(fileData.userId) || 0) + 1)
    }
  }
  
  return {
    totalFiles: storage.size,
    totalSizeBytes: totalSize,
    oldFiles,
    userFileCounts: Object.fromEntries(userFiles)
  }
}

export function cleanupOldFiles(maxAgeHours: number = 1) {
  const storage = getGlobalStorage()
  const now = Date.now()
  const maxAge = maxAgeHours * 60 * 60 * 1000
  let cleanedCount = 0
  
  for (const [fileId, fileData] of storage.entries()) {
    const fileAge = now - new Date(fileData.uploadedAt).getTime()
    if (fileAge > maxAge) {
      storage.delete(fileId)
      cleanedCount++
    }
  }
  
  console.log(`🧹 Cleaned up ${cleanedCount} old files (older than ${maxAgeHours}h)`)
  return cleanedCount
}

export function cleanupBySize(maxFiles: number = 100) {
  const storage = getGlobalStorage()
  
  if (storage.size <= maxFiles) {
    return 0
  }
  
  // Convert to array and sort by upload time (oldest first)
  const files = Array.from(storage.entries())
    .sort(([, a], [, b]) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
  
  const filesToRemove = files.slice(0, storage.size - maxFiles)
  let removedCount = 0
  
  for (const [fileId] of filesToRemove) {
    storage.delete(fileId)
    removedCount++
  }
  
  console.log(`🧹 Cleaned up ${removedCount} files to maintain size limit of ${maxFiles}`)
  return removedCount
}

// Auto-cleanup on startup
if (typeof global !== 'undefined') {
  // Clean up old files on startup
  setTimeout(() => {
    cleanupOldFiles(2) // Remove files older than 2 hours
    cleanupBySize(50) // Keep only 50 most recent files
  }, 1000)
}
