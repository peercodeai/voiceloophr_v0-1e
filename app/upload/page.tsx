"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, FileText, File, Music, Video, X, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { LogoLoader } from "@/components/logo-loader"
import { Navigation } from "@/components/navigation"
import GoogleDriveImport from "@/components/google-drive-import"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "processing" | "completed" | "error" | "cancelled"
  progress: number
  error?: string
  warning?: string
  fileId?: string
  showTextractButton?: boolean
  abortController?: AbortController
  isCancellable?: boolean
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "audio/wav": [".wav"],
  "video/mp4": [".mp4"],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [progressIntervals, setProgressIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map())
  const [userId, setUserId] = useState<string | null>(null)

  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const router = useRouter()

  const [driveOpen, setDriveOpen] = useState(false)

  // Load user authentication state
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          setUserId('00000000-0000-0000-0000-000000000000')
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? '00000000-0000-0000-0000-000000000000')
      } catch (error) {
        console.warn('Failed to load user:', error)
        setUserId('00000000-0000-0000-0000-000000000000')
      }
    }
    loadUser()
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "uploading" as const,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    newFiles.forEach((uploadedFile) => {
      // Start progress simulation
      const progressInterval = simulateProgress(uploadedFile.id)
      if (progressInterval) {
        setProgressIntervals(prev => new Map(prev).set(uploadedFile.id, progressInterval))
      }
      // Process file after a short delay to show progress
      setTimeout(() => {
        processFile(uploadedFile.id, uploadedFile)
      }, 1000)
    })
  }, [])

  const handleDrivePicked = useCallback((file: File) => {
    const newFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "uploading",
      progress: 0,
    }
    setFiles((prev) => [...prev, newFile])
    const interval = simulateProgress(newFile.id)
    if (interval) {
      setProgressIntervals(prev => new Map(prev).set(newFile.id, interval))
    }
    setTimeout(() => {
      processFile(newFile.id, newFile)
    }, 800)
  }, [])

  const processFile = async (fileId: string, uploadedFile: UploadedFile) => {
    if (!uploadedFile) return

    try {
      // Check API key availability first
      const openaiKey = localStorage.getItem("voiceloop_openai_key")
      if (!openaiKey) {
        console.warn("OpenAI API key not found - file will be uploaded but not processed with AI")
        // Continue with upload but mark for manual processing
      }

      // Upload file
      const formData = new FormData()
      formData.append("file", uploadedFile.file)
      formData.append("saveToDatabase", "true") // Automatically save to database
      formData.append("userId", userId || "00000000-0000-0000-0000-000000000000") // Use real user ID or guest

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `Upload failed with status ${uploadResponse.status}`
        throw new Error(errorMessage)
      }

      const uploadResult = await uploadResponse.json()

      // Save to localStorage for persistence (client-side)
      try {
        // Optionally capture a small base64 for viewer fallback (only for small files)
        let localBase64: string | undefined = undefined
        try {
          const SMALL_FILE_LIMIT = 8 * 1024 * 1024 // 8MB
          if (uploadedFile.file.size <= SMALL_FILE_LIMIT) {
            const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const res = String(reader.result || '')
                const comma = res.indexOf(',')
                resolve(comma >= 0 ? res.slice(comma + 1) : res)
              }
              reader.onerror = () => reject(reader.error)
              reader.readAsDataURL(file)
            })
            localBase64 = await readAsBase64(uploadedFile.file)
          }
        } catch {}

        const fileData = {
          id: uploadResult.fileId,
          name: uploadedFile.file.name,
          type: uploadedFile.file.type,
          size: uploadedFile.file.size,
          buffer: "", // not storing server buffer; keep local copy below when small
          localBase64,
          uploadedAt: new Date().toISOString(),
          processed: false,
          processingError: null,
          warnings: [],
          extractedText: uploadResult.extractedText || "",
          wordCount: uploadResult.wordCount || 0,
          pages: 1,
          metadata: {
            processingVersion: "1.0.0",
            processingMethod: "upload",
            confidence: 0.8,
            note: "File uploaded successfully"
          }
        }
        
        // Save to localStorage
        const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        existing[uploadResult.fileId] = fileData
        localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
        console.log(`✅ File ${uploadResult.fileId} saved to localStorage`)
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }

      // Update with file ID from server
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, fileId: uploadResult.fileId, progress: 100, status: "processing" } : f,
        ),
      )

      // Add a small delay to show processing status
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if we have the OpenAI key for AI processing
      if (!openaiKey) {
        // Mark as completed without AI processing if no key
        setFiles((prev) => prev.map((f) => f.id === fileId ? { 
          ...f, 
          status: "completed", 
          progress: 100,
          warning: "File uploaded successfully but AI processing skipped - OpenAI API key not configured"
        } : f))
        
        // Show user-friendly message
        toast("File was uploaded and processed, but AI analysis was skipped because OpenAI API key is not configured. You can configure it in Settings.")
        return
      }

                     // For PDFs, automatically process with our fixed PDF parser
        if (uploadedFile.file.type.includes('pdf')) {
          try {
            console.log(`🚀 Auto-processing PDF with Fixed PDF Parser: ${uploadedFile.file.name}`)
            
            // Add a small delay to ensure server has processed the upload
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Try auto-processing with retry mechanism
            let processingSuccess = false
            let retryCount = 0
            const maxRetries = 2
            
            while (!processingSuccess && retryCount < maxRetries) {
              try {
                console.log(`🔄 Attempt ${retryCount + 1} of ${maxRetries + 1} for auto-processing`)
                
                // Process PDF automatically
                const response = await fetch('/api/textract', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    fileId: uploadResult.fileId,
                    processingMethod: 'fixed-pdf-parser'
                  })
                })

                if (response.ok) {
                  const result = await response.json()
                  
                  // Update localStorage
                  try {
                    const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
                    if (existing[uploadResult.fileId]) {
                      existing[uploadResult.fileId] = {
                        ...existing[uploadResult.fileId],
                        extractedText: result.extractedText,
                        wordCount: result.wordCount,
                        processed: true,
                        processingMethod: "fixed-pdf-parser",
                        processingTime: new Date().toISOString(),
                        metadata: {
                          ...existing[uploadResult.fileId].metadata,
                          processingMethod: "fixed-pdf-parser",
                          confidence: result.confidence,
                          note: "Text extracted using fixed PDF parser (free)"
                        }
                      }
                      localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
                    }
                  } catch (error) {
                    console.warn('Failed to update localStorage:', error)
                  }
                  
                  setFiles((prev) => prev.map((f) => f.id === fileId ? { 
                    ...f, 
                    status: "completed", 
                    progress: 100,
                    warning: `Text extracted successfully using fixed PDF parser (free) - ${result.wordCount} words`,
                    showTextractButton: false
                  } : f))
                  
                  toast.success(`PDF processed successfully! Extracted ${result.wordCount} words using fixed PDF parser (free).`)
                  
                  // Document uploaded successfully - stay on upload page for multiple uploads
                  // Users can view results by clicking the "View Results" button
                  
                  processingSuccess = true
                  
                } else {
                  const errorData = await response.json().catch(() => ({}))
                  const errorMessage = errorData.details || errorData.error || "Processing failed"
                  
                  // If it's a "File not found" error, try re-uploading
                  if (errorMessage.includes('File not found') || errorMessage.includes('server restart')) {
                    console.log(`📤 File not found, attempting re-upload on attempt ${retryCount + 1}`)
                    
                    // Re-upload the file
                    const reUploadFormData = new FormData()
                    reUploadFormData.append('file', uploadedFile.file)
                    
                    const reUploadResponse = await fetch('/api/upload', {
                      method: 'POST',
                      body: reUploadFormData
                    })
                    
                    if (reUploadResponse.ok) {
                      const reUploadResult = await reUploadResponse.json()
                      uploadResult.fileId = reUploadResult.fileId // Update the fileId
                      
                      // Wait a bit before trying to process again
                      await new Promise(resolve => setTimeout(resolve, 2000))
                      retryCount++
                      continue
                    }
                  }
                  
                  // If it's not a file not found error, break the retry loop
                  break
                }
                
              } catch (retryError) {
                console.error(`Retry ${retryCount + 1} failed:`, retryError)
                retryCount++
                
                if (retryCount < maxRetries) {
                  // Wait before next retry
                  await new Promise(resolve => setTimeout(resolve, 2000))
                }
              }
            }
            
            // If all retries failed, fallback to manual processing
            if (!processingSuccess) {
              console.log('🔄 All auto-processing attempts failed, falling back to manual processing')
              setFiles((prev) => prev.map((f) => f.id === fileId ? { 
                ...f, 
                status: "completed", 
                progress: 100,
                warning: "Auto-processing failed. Choose your preferred method below.",
                showTextractButton: true
              } : f))
              
              toast("PDF uploaded. Auto-processing failed - please choose your preferred method below.")
            }
            
          } catch (error) {
            console.error("Auto PDF processing failed:", error)
            // Fallback to manual processing with both options
            setFiles((prev) => prev.map((f) => f.id === fileId ? { 
              ...f, 
              status: "completed", 
              progress: 100,
              warning: "Auto-processing failed. Choose your preferred method below.",
              showTextractButton: true
            } : f))
            
            toast("PDF uploaded. Auto-processing failed - please choose your preferred method below.")
          }
          return
        }
        
        // For images, we need to extract text first before AI processing
        if (uploadedFile.file.type.includes('image')) {
          setFiles((prev) => prev.map((f) => f.id === fileId ? { 
            ...f, 
            status: "completed", 
            progress: 100,
            warning: "File uploaded successfully. Click 'Process with Textract' to extract text content.",
            showTextractButton: true
          } : f))
          
          toast("Image uploaded. Click 'Process with Textract' to extract text content.")
          return
        }

      // Process file with AI with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          openaiKey,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!processResponse.ok) {
        let serverMsg = "Processing failed"
        try {
          const data = await processResponse.json()
          serverMsg = data?.error || data?.details || serverMsg
        } catch {}
        // Do not fail the whole upload; mark as completed with a warning so the user can still view the file
        setFiles((prev) => prev.map((f) => (
          f.id === fileId ? {
            ...f,
            status: "completed",
            progress: 100,
            warning: `AI analysis skipped: ${serverMsg}`
          } : f
        )))
        toast(serverMsg)
        return
      }

      // Mark as completed
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "completed", progress: 100 } : f)))
      
      // Document processed successfully - stay on upload page for multiple uploads
      toast.success("Document processed successfully! You can upload more documents or view results.")
    } catch (error) {
      console.error("File processing error:", error)
      let errorMessage = "Processing failed"
      if (error instanceof Error) {
        if (error.name === 'AbortError') errorMessage = "Processing timed out. Please try again."
        else errorMessage = error.message
      }
      // Do not hard-fail: mark completed with warning to keep UX smooth
      setFiles((prev) => prev.map((f) => (
        f.id === fileId ? {
          ...f,
          status: "completed",
          progress: 100,
          warning: `AI analysis skipped: ${errorMessage}`
        } : f
      )))
      toast(errorMessage)
    }
  }

  const simulateProgress = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15

      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId && file.status === "uploading") {
            if (progress >= 90) {
              clearInterval(interval)
              return { ...file, progress: 90 }
            }
            return { ...file, progress: Math.min(progress, 90) }
          }
          return file
        }),
      )
    }, 150)

    // Store interval reference for cleanup
    return interval
  }

  const cancelProcessing = async (fileId: string) => {
    const fileToCancel = files.find(f => f.id === fileId)
    if (!fileToCancel) return

    try {
      // Call API to stop processing on server side
      if (fileToCancel.fileId) {
        try {
          const stopResponse = await fetch('/api/process/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: fileToCancel.fileId
            })
          })

          if (stopResponse.ok) {
            console.log('✅ Server-side processing stopped successfully')
          } else {
            console.warn('⚠️ Failed to stop server-side processing:', await stopResponse.text())
          }
        } catch (apiError) {
          console.warn('⚠️ API call to stop processing failed:', apiError)
        }
      }

      // Abort any ongoing requests
      if (fileToCancel.abortController) {
        fileToCancel.abortController.abort()
      }

      // Clear progress interval
      const interval = progressIntervals.get(fileId)
      if (interval) {
        clearInterval(interval)
        setProgressIntervals(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileId)
          return newMap
        })
      }

      // Update file status to cancelled
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "cancelled", progress: 0 } : f
        )
      )

      toast("Processing cancelled successfully")
    } catch (error) {
      console.error("Error cancelling processing:", error)
      toast.error("Failed to cancel processing")
    }
  }

  const removeFiles = async (fileIds: string[]) => {
    try {
      for (const fileId of fileIds) {
        const fileToRemove = files.find(f => f.id === fileId)
        if (!fileToRemove) continue

        // Clear progress interval if it exists
        const interval = progressIntervals.get(fileId)
        if (interval) {
          clearInterval(interval)
          setProgressIntervals(prev => {
            const newMap = new Map(prev)
            newMap.delete(fileId)
            return newMap
          })
        }

        // If file has been processed and saved for RAG, clean it up
        if (fileToRemove.fileId && fileToRemove.status === "completed") {
          try {
            // Clean up RAG data (document chunks and embeddings)
            const cleanupResponse = await fetch('/api/rag/cleanup', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: fileToRemove.fileId
              })
            })

            if (cleanupResponse.ok) {
              console.log('RAG data cleaned up successfully')
            } else {
              console.warn('Failed to clean up RAG data:', await cleanupResponse.text())
            }
          } catch (ragError) {
            console.warn('RAG cleanup failed (continuing with file removal):', ragError)
          }

          // Remove from database if it exists there
          try {
            const deleteResponse = await fetch(`/api/documents/${fileToRemove.fileId}`, {
              method: 'DELETE'
            })
            
            if (deleteResponse.ok) {
              console.log('Document removed from database successfully')
            } else {
              console.warn('Failed to remove document from database:', await deleteResponse.text())
            }
          } catch (dbError) {
            console.warn('Database removal failed (continuing with file removal):', dbError)
          }
        }

        // Remove from localStorage
        try {
          if (fileToRemove.fileId) {
            const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
            delete existing[fileToRemove.fileId]
            localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          }
        } catch (localError) {
          console.warn('localStorage cleanup failed:', localError)
        }
      }

      // Remove from UI
      setFiles((prev) => prev.filter((file) => !fileIds.includes(file.id)))
      
      // Clear selection
      setSelectedFiles(new Set())
      
      toast.success(`${fileIds.length} file${fileIds.length > 1 ? 's' : ''} removed successfully`)
    } catch (error) {
      console.error("Error removing files:", error)
      toast.error("Failed to remove files")
    }
  }

    const removeFile = async (fileId: string) => {
    await removeFiles([fileId])
  }

  const retryFile = (fileId: string) => {
    const fileToRetry = files.find(f => f.id === fileId)
    if (fileToRetry) {
      // Reset status and retry
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "uploading", progress: 0, error: undefined } : f
        )
      )
      processFile(fileId, fileToRetry)
    }
  }

  const processWithPdfParse = async (fileId: string) => {
    const fileToProcess = files.find((f) => f.id === fileId)
    if (!fileToProcess || !fileToProcess.fileId) return

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "processing", progress: 50 } : f
      )
    )

    try {
      console.log(`🚀 Processing with Fixed PDF Parser: ${fileToProcess.file.name}`)

      // Use the Textract API with fixed PDF parser method
      const response = await fetch('/api/textract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileToProcess.fileId,
          processingMethod: 'fixed-pdf-parser'
        })
      })

             if (!response.ok) {
         const errorData = await response.json().catch(() => ({}))
         const errorMessage = errorData.details || errorData.error || "Fixed PDF Parser processing failed"
         
         // If file not found, it might be due to server restart - try uploading again
         if (errorMessage.includes("File not found") || errorMessage.includes("server restart")) {
           console.log("🔄 File not found - likely server restart. Retrying with re-upload...")
           
           // Try to re-upload the file first
           const reUploadFormData = new FormData()
           reUploadFormData.append("file", fileToProcess.file)
           
           const reUploadResponse = await fetch("/api/upload", {
             method: "POST",
             body: reUploadFormData,
           })
           
           if (reUploadResponse.ok) {
             const reUploadResult = await reUploadResponse.json()
             
             // Update the file ID and try processing again
             fileToProcess.fileId = reUploadResult.fileId
             
             // Try processing again with new file ID
             const retryResponse = await fetch('/api/textract', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                 fileId: reUploadResult.fileId,
                 processingMethod: 'fixed-pdf-parser'
               })
             })
             
             if (retryResponse.ok) {
               const retryResult = await retryResponse.json()
               
               // Update localStorage with new file ID
               try {
                 const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
                 existing[reUploadResult.fileId] = {
                   ...existing[fileToProcess.fileId || ''],
                   id: reUploadResult.fileId,
                   extractedText: retryResult.extractedText,
                   wordCount: retryResult.wordCount,
                   processed: true,
                   processingMethod: "fixed-pdf-parser",
                   processingTime: new Date().toISOString(),
                   metadata: {
                     processingMethod: "fixed-pdf-parser",
                     confidence: retryResult.confidence,
                     note: "Text extracted using fixed PDF parser (free) - retry successful"
                   }
                 }
                 localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
               } catch (error) {
                 console.warn('Failed to update localStorage:', error)
               }
               
               // Update file with extracted content
               setFiles((prev) =>
                 prev.map((f) =>
                   f.id === fileId ? { 
                     ...f, 
                     fileId: reUploadResult.fileId,
                     status: "completed", 
                     progress: 100,
                     warning: `Text extracted successfully using fixed PDF parser (free) - ${retryResult.wordCount} words`,
                     showTextractButton: false
                   } : f
                 )
               )
               
               toast.success(`PDF processed successfully! Extracted ${retryResult.wordCount} words using fixed PDF parser (free).`)
               
               // Document re-uploaded successfully - stay on upload page
               
               return // Success - exit early
             }
           }
         }
         
         throw new Error(errorMessage)
       }

      const result = await response.json()

      // Save to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        if (fileToProcess.fileId && existing[fileToProcess.fileId]) {
          existing[fileToProcess.fileId] = {
            ...existing[fileToProcess.fileId],
            extractedText: result.extractedText,
            wordCount: result.wordCount,
            processed: true,
            processingMethod: "fixed-pdf-parser",
            processingTime: new Date().toISOString(),
            metadata: {
              ...(existing[fileToProcess.fileId]?.metadata || {}),
              processingMethod: "fixed-pdf-parser",
              confidence: result.confidence,
              note: "Text extracted using fixed PDF parser (free)"
            }
          }
          localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          console.log(`✅ Updated file ${fileToProcess.fileId} in localStorage with fixed PDF parser results`)
        }
      } catch (error) {
        console.warn('Failed to update localStorage:', error)
      }

      // Update file with extracted content
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "completed", 
            progress: 100,
            warning: "Text extracted successfully using fixed PDF parser (free)",
            showTextractButton: false
          } : f
        )
      )

      toast.success(`Successfully extracted ${result.wordCount} words using fixed PDF parser (free)! You can upload more documents or view results.`)
      
      // Document processed successfully - stay on upload page for multiple uploads

    } catch (error) {
      console.error("Fixed PDF Parser processing error:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Fixed PDF Parser processing failed. Please try again."
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "error", 
            error: errorMessage,
            showTextractButton: true
          } : f
        )
      )

      toast(`Failed to extract text: ${errorMessage}`)
    }
  }

  const processWithTextract = async (fileId: string) => {
    const fileToProcess = files.find(f => f.id === fileId)
    if (!fileToProcess || !fileToProcess.fileId) return

    try {
      // Update status to processing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "processing", progress: 50 } : f
        )
      )

      // Call Textract API
      const response = await fetch("/api/textract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: fileToProcess.fileId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || "Textract processing failed"
        throw new Error(`Textract processing failed: ${errorMessage}`)
      }

      const result = await response.json()

             // Save updated file data to localStorage
       try {
         const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
         if (existing[fileToProcess.fileId]) {
           existing[fileToProcess.fileId] = {
             ...existing[fileToProcess.fileId],
             extractedText: result.extractedText,
             wordCount: result.wordCount,
             processed: true,
             processingMethod: result.processingMethod || "textract",
             processingTime: new Date().toISOString(),
             metadata: {
               ...existing[fileToProcess.fileId].metadata,
               processingMethod: result.processingMethod || "textract",
               confidence: result.confidence || 0.95,
               note: result.processingMethod === "textract" ? "Text extracted using AWS Textract" : 
                     result.processingMethod === "fixed-pdf-parser" ? "Text extracted using fixed PDF parser (free)" :
                     "Text extracted using fallback method"
             }
           }
           localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
           console.log(`✅ Updated file ${fileToProcess.fileId} in localStorage with ${result.processingMethod || "textract"} results`)
         }
       } catch (error) {
         console.warn('Failed to update localStorage:', error)
       }

      // Update file with extracted content
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "completed", 
            progress: 100,
            warning: "Text extracted successfully using AWS Textract",
            showTextractButton: false
          } : f
        )
      )

      toast.success(`Successfully extracted ${result.wordCount} words using AWS Textract! You can upload more documents or view results.`)
      
      // Document processed successfully - stay on upload page for multiple uploads

    } catch (error) {
      console.error("Textract processing error:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Textract processing failed. Please try again."
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "error", 
            error: errorMessage,
            showTextractButton: true
          } : f
        )
      )

      toast(`Failed to extract text: ${errorMessage}`)
    }
  }

  const viewResults = (uploadedFile: UploadedFile) => {
    if (uploadedFile.fileId) {
      router.push(`/results/${uploadedFile.fileId}`)
    }
  }



  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return <FileText className="h-6 w-6 text-red-500 drop-shadow-sm" />
    if (file.type.includes("audio")) return <Music className="h-6 w-6 text-blue-500 drop-shadow-sm" />
    if (file.type.includes("video")) return <Video className="h-6 w-6 text-purple-500 drop-shadow-sm" />
    return <File className="h-6 w-6 text-primary drop-shadow-sm" />
  }

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Cleanup progress intervals when component unmounts
  useEffect(() => {
    return () => {
      progressIntervals.forEach(interval => clearInterval(interval))
    }
  }, [progressIntervals])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-foreground mb-4 text-balance">Upload Your Documents</h1>
          <p className="text-lg text-muted-foreground font-light text-pretty">
            Drag and drop your files or click to browse. We support PDF, Markdown, CSV, audio, and video files.
          </p>
          <div className="mt-4 flex items-center justify-center">
            <Button
              variant="outline"
              className="font-light bg-transparent"
              onClick={() => setDriveOpen(true)}
            >
              Import from Google Drive
            </Button>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8">
          <div
            {...getRootProps()}
            className={`p-12 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
              isDragActive ? "border-primary bg-primary/5 shadow-lg" : "border-primary/30 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="h-16 w-16 text-primary mx-auto mb-4 drop-shadow-lg" />
              {isDragActive ? (
                <p className="text-lg font-light text-primary">Drop your files here...</p>
              ) : (
                <>
                  <p className="text-lg font-light text-foreground mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, Markdown, CSV, WAV, MP4 • Max 50MB per file
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

                 {/* File List */}
         {files.length > 0 && (
           <div className="space-y-4">
                            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <h2 className="text-2xl font-light text-foreground">Processing Files ({files.length})</h2>
                   
                   {/* Select All Checkbox */}
                   {files.length > 0 && (
                     <div className="flex items-center gap-2">
                       <input
                         type="checkbox"
                         checked={selectedFiles.size === files.length && files.length > 0}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedFiles(new Set(files.map(f => f.id)))
                           } else {
                             setSelectedFiles(new Set())
                           }
                         }}
                         className="h-4 w-4 text-primary border-primary/30 rounded focus:ring-primary/50"
                       />
                       <span className="text-sm text-muted-foreground">
                         Select All
                       </span>
                     </div>
                   )}
                 </div>
                 
                 {/* Bulk Actions */}
                 {selectedFiles.size > 0 && (
                   <div className="flex items-center gap-3">
                     <span className="text-sm text-muted-foreground">
                       {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
                     </span>
                     <Button
                       variant="destructive"
                       size="sm"
                       onClick={() => {
                         const selectedArray = Array.from(selectedFiles)
                         setDeleteConfirmFile('bulk')
                         setSelectedFiles(new Set(selectedArray))
                       }}
                       className="font-light"
                     >
                       Delete Selected ({selectedFiles.size})
                     </Button>
                   </div>
                 )}
               </div>
            
            {/* API Key Status */}
            {!localStorage.getItem("voiceloop_openai_key") && (
              <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      OpenAI API Key Not Configured
                    </p>
                    <p className="text-xs text-yellow-700">
                      Files will be uploaded and processed, but AI analysis will be skipped. 
                      <Link href="/settings" className="text-yellow-800 underline ml-1 hover:text-yellow-900">
                        Configure API key in Settings
                      </Link>
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {files.map((uploadedFile) => (
                                            <Card key={uploadedFile.id} className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200 shadow-sm hover:shadow-md">
                 <div className="flex items-center gap-4">
                   {/* Selection Checkbox */}
                   <input
                     type="checkbox"
                     checked={selectedFiles.has(uploadedFile.id)}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setSelectedFiles(prev => new Set([...prev, uploadedFile.id]))
                       } else {
                         setSelectedFiles(prev => {
                           const newSet = new Set(prev)
                           newSet.delete(uploadedFile.id)
                           return newSet
                         })
                       }
                     }}
                     className="h-4 w-4 text-primary border-primary/30 rounded focus:ring-primary/50"
                   />
                   
                   <div className="text-muted-foreground">{getFileIcon(uploadedFile.file)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-foreground truncate">{uploadedFile.file.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                      {uploadedFile.fileId && (
                        <Badge variant="outline" className="text-xs">
                          {uploadedFile.file.type.split("/")[1]?.toUpperCase() || "FILE"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={uploadedFile.progress} className="flex-1 h-2" />
                      <div className="flex items-center gap-2 min-w-0">
                                                 {uploadedFile.status === "uploading" && (
                           <>
                             <LogoLoader size="sm" text="Uploading..." />
                           </>
                         )}
                         {uploadedFile.status === "processing" && (
                           <>
                             <LogoLoader size="sm" text={uploadedFile.fileId ? "Processing with AI..." : "Uploading..."} />
                             {/* Cancel Button for Processing */}
                             <Button
                               size="sm"
                               variant="outline"
                               className="ml-2 font-light bg-transparent border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                               onClick={() => cancelProcessing(uploadedFile.id)}
                             >
                               Cancel
                             </Button>
                           </>
                         )}
                        {uploadedFile.status === "completed" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Complete</span>
                            {uploadedFile.warning && (
                              <span className="text-sm text-yellow-600 ml-2">⚠️ {uploadedFile.warning}</span>
                            )}
                          </>
                        )}
                        {uploadedFile.status === "cancelled" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Cancelled</span>
                          </>
                        )}
                        

                        
                                                 {/* Processing Options - Only for completed files that need processing */}
                         {uploadedFile.status === "completed" && uploadedFile.showTextractButton && (
                           <>
                             <Button
                               size="sm"
                               variant="outline"
                               className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                               onClick={() => processWithPdfParse(uploadedFile.id)}
                             >
                               🆓 Free PDF Parser
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                               onClick={() => processWithTextract(uploadedFile.id)}
                             >
                               💰 AWS Textract (Paid)
                             </Button>
                           </>
                         )}
                        
                        {/* View Results Button - Only for completed files */}
                        {uploadedFile.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                            onClick={() => viewResults(uploadedFile)}
                          >
                            View Results
                          </Button>
                        )}
                        {uploadedFile.status === "error" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">{uploadedFile.error || "Error"}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={() => retryFile(uploadedFile.id)}
                            >
                              Retry
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                                     <div className="flex items-center gap-2">
                     {/* Delete Button */}
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => setDeleteConfirmFile(uploadedFile.id)}
                       className="text-red-500 hover:text-red-600 hover:bg-red-50"
                       title="Delete file and all associated data"
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </Card>
            ))}
          </div>
                 )}
       </div>

               {/* Delete Confirmation Modal */}
        {deleteConfirmFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-background border-2 border-red-200 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {deleteConfirmFile === 'bulk' ? 'Delete Selected Files?' : 'Delete File?'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This will permanently delete {deleteConfirmFile === 'bulk' ? 'the selected files' : 'the file'} and all associated data including:
                  <br />• Document content and metadata
                  <br />• RAG embeddings and search chunks
                  <br />• Database records
                  <br />• Local storage data
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirmFile(null)
                      setSelectedFiles(new Set())
                    }}
                    className="font-light"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (deleteConfirmFile === 'bulk') {
                        await removeFiles(Array.from(selectedFiles))
                      } else {
                        await removeFile(deleteConfirmFile)
                      }
                      setDeleteConfirmFile(null)
                      setSelectedFiles(new Set())
                    }}
                    className="font-light"
                  >
                    {deleteConfirmFile === 'bulk' ? `Delete ${selectedFiles.size} Files` : 'Delete Permanently'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}


      {/* Google Drive Import Modal */}
      <GoogleDriveImport
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        onPicked={handleDrivePicked}
      />
     </div>
   )
 }
