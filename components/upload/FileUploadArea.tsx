"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, FileText, File, Music, Video } from "lucide-react"
import { UploadedFile } from "@/lib/types"

interface FileUploadAreaProps {
  onDrop: (acceptedFiles: File[]) => void
  onDriveImport: () => void
  isUploading: boolean
  acceptedFileTypes: Record<string, string[]>
  maxFileSize: number
}

const fileTypeIcons = {
  "application/pdf": FileText,
  "text/markdown": FileText,
  "text/csv": FileText,
  "audio/wav": Music,
  "video/mp4": Video,
  "default": File
}

export function FileUploadArea({ 
  onDrop, 
  onDriveImport, 
  isUploading, 
  acceptedFileTypes, 
  maxFileSize 
}: FileUploadAreaProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    disabled: isUploading
  })

  const getFileTypeIcon = (mimeType: string) => {
    const IconComponent = fileTypeIcons[mimeType as keyof typeof fileTypeIcons] || fileTypeIcons.default
    return <IconComponent className="w-8 h-8 text-muted-foreground" />
  }

  const supportedTypes = Object.keys(acceptedFileTypes).map(type => {
    const extensions = acceptedFileTypes[type].join(', ')
    return { type, extensions, icon: getFileTypeIcon(type) }
  })

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Upload Area */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <div
          {...getRootProps()}
          className={`p-12 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'bg-muted/50 border-primary' 
              : 'hover:bg-muted/25'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <Upload className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                {isDragActive ? 'Drop files here' : 'Upload your documents'}
              </h3>
              <p className="text-muted-foreground">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-sm text-muted-foreground">
                Max file size: {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Supported File Types */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium">Supported file types:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {supportedTypes.map(({ type, extensions, icon }) => (
            <div key={type} className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
              {icon}
              <div className="text-sm">
                <div className="font-medium">{type.split('/')[1].toUpperCase()}</div>
                <div className="text-muted-foreground">{extensions}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import Options */}
      <div className="flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onDriveImport}
          disabled={isUploading}
        >
          Import from Google Drive
        </Button>
      </div>
    </div>
  )
}
