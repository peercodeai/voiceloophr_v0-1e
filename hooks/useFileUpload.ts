import { useState, useCallback } from 'react'
import { UploadedFile, FileUploadResult } from '@/lib/types'
import { useGuestMode } from './useAuth'

interface UseFileUploadOptions {
  maxFileSize?: number
  acceptedTypes?: Record<string, string[]>
  autoUpload?: boolean
}

interface UseFileUploadReturn {
  files: UploadedFile[]
  isUploading: boolean
  uploadProgress: number
  error: string | null
  handleDrop: (acceptedFiles: File[]) => void
  uploadFile: (file: File) => Promise<FileUploadResult>
  uploadAllFiles: () => Promise<FileUploadResult[]>
  removeFile: (fileId: string) => void
  clearFiles: () => void
  retryUpload: (fileId: string) => Promise<void>
  cancelUpload: (fileId: string) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    acceptedTypes = {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
      "audio/wav": [".wav"],
      "video/mp4": [".mp4"],
    },
    autoUpload = false
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { userId } = useGuestMode()

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => {
      // Validate file size
      if (file.size > maxFileSize) {
        return {
          id: `file_${Date.now()}_${index}`,
          file,
          status: 'error',
          progress: 0,
          error: `File too large (max ${Math.round(maxFileSize / (1024 * 1024))}MB)`
        }
      }

      // Validate file type
      const isValidType = Object.keys(acceptedTypes).some(type => 
        file.type === type || acceptedTypes[type].some(ext => 
          file.name.toLowerCase().endsWith(ext)
        )
      )

      if (!isValidType) {
        return {
          id: `file_${Date.now()}_${index}`,
          file,
          status: 'error',
          progress: 0,
          error: 'Unsupported file type'
        }
      }

      return {
        id: `file_${Date.now()}_${index}`,
        file,
        status: 'uploading',
        progress: 0,
        isCancellable: true,
        abortController: new AbortController()
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    if (autoUpload) {
      uploadAllFiles()
    }
  }, [maxFileSize, acceptedTypes, autoUpload])

  const uploadFile = useCallback(async (file: File): Promise<FileUploadResult> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("saveToDatabase", "true")
    formData.append("userId", userId)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      return {
        success: true,
        fileId: result.fileId,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.fileSize,
        wordCount: result.wordCount,
        extractedText: result.extractedText,
        saved: result.saved,
        storagePath: result.storagePath,
        contentType: result.contentType,
        documentId: result.documentId,
        message: result.message
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [userId])

  const uploadAllFiles = useCallback(async (): Promise<FileUploadResult[]> => {
    const filesToUpload = files.filter(f => f.status === 'uploading' || f.status === 'error')
    
    if (filesToUpload.length === 0) {
      return []
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    const results: FileUploadResult[] = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      
      // Update file status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading' as const } : f
      ))

      try {
        const result = await uploadFile(file.file)
        results.push(result)

        if (result.success) {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'completed' as const, 
              progress: 100,
              fileId: result.fileId 
            } : f
          ))
        } else {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error' as const, 
              error: result.error 
            } : f
          ))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        results.push({ success: false, error: errorMessage })
        
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'error' as const, 
            error: errorMessage 
          } : f
        ))
      }

      // Update progress
      setUploadProgress(((i + 1) / filesToUpload.length) * 100)
    }

    setIsUploading(false)
    return results
  }, [files, uploadFile])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setError(null)
    setUploadProgress(0)
  }, [])

  const retryUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading' as const, error: undefined } : f
    ))

    try {
      const result = await uploadFile(file.file)
      
      if (result.success) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'completed' as const, 
            progress: 100,
            fileId: result.fileId 
          } : f
        ))
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error' as const, 
            error: result.error 
          } : f
        ))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error' as const, 
          error: errorMessage 
        } : f
      ))
    }
  }, [files, uploadFile])

  const cancelUpload = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId && f.abortController) {
        f.abortController.abort()
        return { ...f, status: 'cancelled' as const, isCancellable: false }
      }
      return f
    }))
  }, [])

  return {
    files,
    isUploading,
    uploadProgress,
    error,
    handleDrop,
    uploadFile,
    uploadAllFiles,
    removeFile,
    clearFiles,
    retryUpload,
    cancelUpload
  }
}
