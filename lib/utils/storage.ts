// Storage utilities for persisting data between page refreshes
// This is a temporary solution until we implement a proper database

export interface StoredFileData {
  id: string
  name: string
  type: string
  size: number
  buffer: string
  uploadedAt: string
  processed: boolean
  processingError: string | null
  warnings: string[]
  extractedText: string
  wordCount: number
  pages: number
  metadata: {
    processingVersion: string
    processingMethod: string
    confidence: number
    note: string
  }
  processingTime?: string
}

export class LocalStorageManager {
  private static STORAGE_KEY = 'voiceloop_uploaded_files'

  /**
   * Save file data to localStorage
   */
  static saveFile(fileId: string, fileData: StoredFileData): void {
    if (typeof window === 'undefined') return

    try {
      const existing = this.getAllFiles()
      existing[fileId] = fileData
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing))
      console.log(`File ${fileId} saved to localStorage`)
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  /**
   * Get a specific file by ID
   */
  static getFile(fileId: string): StoredFileData | null {
    if (typeof window === 'undefined') return null

    try {
      const files = this.getAllFiles()
      return files[fileId] || null
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
      return null
    }
  }

  /**
   * Get all stored files
   */
  static getAllFiles(): Record<string, StoredFileData> {
    if (typeof window === 'undefined') return {}

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
      return {}
    }
  }

  /**
   * Remove a specific file
   */
  static removeFile(fileId: string): void {
    if (typeof window === 'undefined') return

    try {
      const files = this.getAllFiles()
      delete files[fileId]
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(files))
      console.log(`File ${fileId} removed from localStorage`)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }

  /**
   * Clear all stored files
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('All files cleared from localStorage')
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): { used: number; available: number; percentage: number } {
    if (typeof window === 'undefined') return { used: 0, available: 0, percentage: 0 }

    try {
      const used = JSON.stringify(this.getAllFiles()).length
      const available = 5 * 1024 * 1024 // 5MB typical localStorage limit
      const percentage = (used / available) * 100

      return { used, available, percentage }
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 }
    }
  }
}
