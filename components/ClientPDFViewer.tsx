"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  AlertCircle 
} from "lucide-react"
import { Document, Page, pdfjs } from 'react-pdf'

// Set up PDF.js worker matching the library's version to avoid mismatch warnings
if (typeof window !== 'undefined') {
  // Use CDN worker that matches the bundled pdfjs version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

interface ClientPDFViewerProps {
  fileData: string | null
  document: {
    id: string
    name: string
    type: string
    size: number
    extractedText: string
  }
}

export default function ClientPDFViewer({ fileData, document }: ClientPDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!fileData) {
      setNumPages(null)
      setPageNumber(1)
      setScale(1.0)
      setRotation(0)
      setPdfError(null)
    }
  }, [fileData])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    setPdfError(null)
  }

  function onDocumentLoadError(error: any) {
    console.error('Error loading PDF document:', error)
    setPdfError('Failed to load PDF document. It might be corrupted or unsupported.')
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      if (numPages === null) return prevPageNumber
      return Math.max(1, Math.min(prevPageNumber + offset, numPages))
    })
  }

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.1, 3.0))
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.1, 0.5))
  const rotate = () => setRotation(prevRotation => (prevRotation + 90) % 360)

  const fileUrl = fileData ? `data:${document.type};base64,${fileData}` : null

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="animate-pulse h-12 w-12 mx-auto mb-4">
          <Image
            src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
            alt="VoiceLoop"
            width={48}
            height={48}
            className="h-full w-full object-contain"
          />
        </div>
        <p className="text-lg font-light">Loading PDF viewer...</p>
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg">Document not loaded</p>
        <p className="text-sm">No file data available for preview.</p>
      </div>
    )
  }

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg">No file data available for preview.</p>
        <p className="text-sm">Please ensure the file was uploaded correctly.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center h-full">
      {pdfError ? (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-lg">{pdfError}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-foreground">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <Button variant="outline" size="sm" onClick={() => changePage(1)} disabled={pageNumber >= (numPages || 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={rotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-auto flex-grow w-full flex justify-center items-center bg-gray-100 dark:bg-gray-800 rounded-md p-2">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="max-w-full h-auto"
              loading={
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <div className="animate-pulse h-8 w-8 mb-2">
                    <Image
                      src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
                      alt="VoiceLoop"
                      width={32}
                      height={32}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="font-light">Loading PDF...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-64 text-destructive">
                  <AlertCircle className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Failed to load PDF document</p>
                  <p className="text-sm text-muted-foreground">It might be corrupted or unsupported</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            </Document>
          </div>
        </>
      )}
    </div>
  )
}
