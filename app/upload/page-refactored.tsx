"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { FileUploadArea } from "@/components/upload/FileUploadArea"
import { FileList } from "@/components/upload/FileList"
import { UploadProgress } from "@/components/upload/UploadProgress"
import { useAuth, useGuestMode } from "@/hooks/useAuth"
import { useFileUpload } from "@/hooks/useFileUpload"
import { toast } from "sonner"

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "audio/wav": [".wav"],
  "video/mp4": [".mp4"],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPageRefactored() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { isGuest, userId } = useGuestMode()
  
  const [driveOpen, setDriveOpen] = useState(false)
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const {
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
  } = useFileUpload({
    maxFileSize: MAX_FILE_SIZE,
    acceptedTypes: ACCEPTED_FILE_TYPES,
    autoUpload: false
  })

  const handleDrivePicked = useCallback((file: File) => {
    // Add the file to the upload queue
    handleDrop([file])
  }, [handleDrop])

  const handleUploadAll = useCallback(async () => {
    try {
      const results = await uploadAllFiles()
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} file(s) failed to upload`)
      }
    } catch (error) {
      toast.error('Upload failed')
      console.error('Upload error:', error)
    }
  }, [uploadAllFiles])

  const handleSelectFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file && file.fileId) {
      router.push(`/results/${file.fileId}`)
    }
  }, [files, router])

  const handleRetryAll = useCallback(() => {
    files.forEach(file => {
      if (file.status === 'error') {
        retryUpload(file.id)
      }
    })
  }, [files, retryUpload])

  const handleClearAll = useCallback(() => {
    clearFiles()
    setSelectedFiles(new Set())
  }, [clearFiles])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Upload Documents</h1>
            <p className="text-muted-foreground">
              {isGuest ? 'Upload and process documents (guest mode)' : `Welcome back, ${user?.name || 'User'}`}
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <FileUploadArea
            onDrop={handleDrop}
            onDriveImport={() => setDriveOpen(true)}
            isUploading={isUploading}
            acceptedFileTypes={ACCEPTED_FILE_TYPES}
            maxFileSize={MAX_FILE_SIZE}
          />
        </div>

        {/* Upload Progress */}
        {(isUploading || files.length > 0) && (
          <UploadProgress
            files={files}
            isUploading={isUploading}
            overallProgress={uploadProgress}
          />
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-8">
            <FileList
              files={files}
              onRemoveFile={removeFile}
              onRetryUpload={retryUpload}
              onCancelUpload={cancelUpload}
              onSelectFile={handleSelectFile}
              selectedFiles={selectedFiles}
              deleteConfirmFile={deleteConfirmFile}
              onSetDeleteConfirmFile={setDeleteConfirmFile}
            />
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex justify-center space-x-4">
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || files.every(f => f.status === 'completed')}
              className="px-8"
            >
              {isUploading ? 'Uploading...' : 'Upload All Files'}
            </Button>
            
            {files.some(f => f.status === 'error') && (
              <Button
                variant="outline"
                onClick={handleRetryAll}
                disabled={isUploading}
              >
                Retry Failed
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={isUploading}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Guest Mode Notice */}
        {isGuest && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Guest Mode</h3>
            <p className="text-yellow-700 text-sm">
              You're using the app in guest mode. Your files will be processed but not saved permanently. 
              <Link href="/login" className="underline ml-1">
                Sign in
              </Link> to save your documents and access them later.
            </p>
          </div>
        )}

        {/* Google Drive Import Modal */}
        {driveOpen && (
          <GoogleDriveImport
            onFilePicked={handleDrivePicked}
            onClose={() => setDriveOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
