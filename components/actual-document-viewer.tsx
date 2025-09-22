"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Image as ImageIcon,
  File,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react"

interface ActualDocumentViewerProps {
  document: {
    id: string
    name: string
    type: string
    size: number
    extractedText: string
    fileUrl?: string
    fileData?: string // Base64 data
  }
  isOpen: boolean
  onClose: () => void
}

export function ActualDocumentViewer({ 
  document, 
  isOpen, 
  onClose 
}: ActualDocumentViewerProps) {
  const [copied, setCopied] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  if (!isOpen) return null

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const getFileTypeIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("image")) return <ImageIcon className="h-5 w-5 text-green-500" />
    if (type.includes("audio")) return <File className="h-5 w-5 text-purple-500" />
    if (type.includes("video")) return <File className="h-5 w-5 text-orange-500" />
    return <File className="h-5 w-5 text-blue-500" />
  }

  const renderDocumentContent = () => {
    const fileType = document.type.toLowerCase()
    
    if (fileType.includes("pdf")) {
      return (
        <div className="w-full h-full">
          <iframe
            src={document.fileUrl || `data:application/pdf;base64,${document.fileData}`}
            className="w-full h-full border-0 rounded-lg"
            style={{ 
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top left'
            }}
          />
        </div>
      )
    }
    
    if (fileType.includes("image")) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={document.fileUrl || `data:${document.type};base64,${document.fileData}`}
            alt={document.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            style={{ 
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          />
        </div>
      )
    }
    
    if (fileType.includes("audio")) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <audio
            controls
            className="w-full max-w-md"
            src={document.fileUrl || `data:${document.type};base64,${document.fileData}`}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )
    }
    
    if (fileType.includes("video")) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <video
            controls
            className="w-full max-w-4xl"
            src={document.fileUrl || `data:${document.type};base64,${document.fileData}`}
          >
            Your browser does not support the video element.
          </video>
        </div>
      )
    }
    
    // For text files, show the extracted text
    return (
      <div className="w-full h-full p-6">
        <div className="bg-muted/20 rounded-lg p-4 h-full overflow-y-auto">
          <div className="text-sm font-light leading-relaxed text-foreground whitespace-pre-wrap">
            {document.extractedText}
          </div>
        </div>
      </div>
    )
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const resetView = () => {
    setZoom(100)
    setRotation(0)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col border-2 border-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-gradient-to-r from-background to-primary/5">
          <div className="flex items-center gap-3">
            {getFileTypeIcon(document.type)}
            <div>
              <h2 className="text-lg font-light text-foreground">{document.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-light border-2 border-primary/30 bg-primary/5 text-primary">
                  {document.type.split("/")[1]?.toUpperCase() || "FILE"}
                </Badge>
                <span>{formatFileSize(document.size)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Rotate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            {/* Reset View */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
            >
              Reset
            </Button>
            
            {/* Copy Text Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(document.extractedText)}
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
            >
              {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy Text"}
            </Button>
            
            {/* Close Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Document Content */}
        <div className="flex-1 overflow-hidden">
          {renderDocumentContent()}
        </div>
      </Card>
    </div>
  )
}
