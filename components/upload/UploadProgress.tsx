"use client"

import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { UploadedFile } from "@/lib/types"

interface UploadProgressProps {
  files: UploadedFile[]
  isUploading: boolean
  overallProgress: number
}

export function UploadProgress({ files, isUploading, overallProgress }: UploadProgressProps) {
  if (!isUploading && files.length === 0) {
    return null
  }

  const completedFiles = files.filter(f => f.status === 'completed').length
  const errorFiles = files.filter(f => f.status === 'error').length
  const uploadingFiles = files.filter(f => f.status === 'uploading').length

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Progress</h3>
          <div className="text-sm text-muted-foreground">
            {completedFiles} completed • {errorFiles} failed • {uploadingFiles} uploading
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {isUploading && (
          <div className="text-sm text-muted-foreground">
            Uploading files... Please don't close this page.
          </div>
        )}

        {errorFiles > 0 && (
          <div className="text-sm text-red-600">
            {errorFiles} file(s) failed to upload. You can retry them individually.
          </div>
        )}

        {completedFiles === files.length && files.length > 0 && (
          <div className="text-sm text-green-600">
            All files uploaded successfully!
          </div>
        )}
      </div>
    </Card>
  )
}
