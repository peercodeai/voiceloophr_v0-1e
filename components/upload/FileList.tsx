"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  FileText,
  File,
  Music,
  Video
} from "lucide-react"
import { UploadedFile } from "@/lib/types"

interface FileListProps {
  files: UploadedFile[]
  onRemoveFile: (fileId: string) => void
  onRetryUpload: (fileId: string) => void
  onCancelUpload: (fileId: string) => void
  onSelectFile: (fileId: string) => void
  selectedFiles: Set<string>
  deleteConfirmFile: string | null
  onSetDeleteConfirmFile: (fileId: string | null) => void
}

const fileTypeIcons = {
  "application/pdf": FileText,
  "text/markdown": FileText,
  "text/csv": FileText,
  "audio/wav": Music,
  "video/mp4": Video,
  "default": File
}

const statusColors = {
  uploading: "bg-blue-500",
  processing: "bg-yellow-500",
  completed: "bg-green-500",
  error: "bg-red-500",
  cancelled: "bg-gray-500"
}

const statusIcons = {
  uploading: Play,
  processing: Play,
  completed: CheckCircle,
  error: AlertCircle,
  cancelled: X
}

export function FileList({
  files,
  onRemoveFile,
  onRetryUpload,
  onCancelUpload,
  onSelectFile,
  selectedFiles,
  deleteConfirmFile,
  onSetDeleteConfirmFile
}: FileListProps) {
  const getFileTypeIcon = (mimeType: string) => {
    const IconComponent = fileTypeIcons[mimeType as keyof typeof fileTypeIcons] || fileTypeIcons.default
    return <IconComponent className="w-5 h-5" />
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    const IconComponent = statusIcons[status]
    return <IconComponent className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No files uploaded yet</p>
        <p className="text-sm">Upload some files to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Uploaded Files ({files.length})</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              files.forEach(file => {
                if (file.status === 'error') {
                  onRetryUpload(file.id)
                }
              })
            }}
            disabled={!files.some(f => f.status === 'error')}
          >
            Retry All Failed
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {files.map((file) => (
          <Card key={file.id} className="p-4">
            <div className="flex items-center space-x-4">
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileTypeIcon(file.file.type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-medium truncate">{file.file.name}</h4>
                  <Badge 
                    variant="secondary" 
                    className={`${statusColors[file.status]} text-white`}
                  >
                    {file.status}
                  </Badge>
                  {file.showTextractButton && (
                    <Badge variant="outline" className="text-xs">
                      AWS Textract Available
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(file.file.size)}</span>
                  <span>•</span>
                  <span>{file.file.type}</span>
                </div>

                {/* Progress Bar */}
                {file.status === 'uploading' && (
                  <div className="mt-2">
                    <Progress value={file.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.progress}% uploaded
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {file.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {file.error}
                  </div>
                )}

                {/* Warning Message */}
                {file.warning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    {file.warning}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {file.status === 'uploading' && file.isCancellable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancelUpload(file.id)}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                )}

                {file.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryUpload(file.id)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}

                {file.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectFile(file.id)}
                  >
                    View
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetDeleteConfirmFile(file.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete File</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onSetDeleteConfirmFile(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onRemoveFile(deleteConfirmFile)
                  onSetDeleteConfirmFile(null)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
