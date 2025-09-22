import { type NextRequest, NextResponse } from "next/server"
import { initializeGlobalStorage, setFileInGlobalStorage } from "@/lib/global-storage"
import { supabaseAdmin, supabase } from "@/lib/supabase"
import { createErrorResponse, APIError } from "@/lib/validation"
import { getUserContext, isGuestUser, GUEST_USER_ID } from "@/lib/auth"
import { documentService } from "@/services/documentService"
import { GlobalFileData } from "@/lib/types"

// Textract client removed - using fixed PDF parser instead

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const saveToDatabase = (formData.get("saveToDatabase") as string) === "true"
    const rawUserId = (formData.get("userId") as string) || undefined
    
    // Normalize user ID - convert 'guest-user' to proper guest UUID
    const userId = isGuestUser(rawUserId) ? GUEST_USER_ID : rawUserId
    const userContext = getUserContext(userId)

    if (!file) {
      return NextResponse.json(
        createErrorResponse(400, "No file provided", "MISSING_FILE"),
        { status: 400 }
      )
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        createErrorResponse(400, `File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)`, "FILE_TOO_LARGE"),
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/csv',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff',
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/x-wav',
      'video/mp4', 'video/avi', 'video/mov'
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|csv|pdf|doc|docx|jpg|jpeg|png|gif|bmp|tiff|wav|mp3|mp4|avi|mov)$/i)) {
      return NextResponse.json(
        createErrorResponse(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE", {
          supportedTypes: allowedTypes,
          fileName: file.name,
          mimeType: file.type
        }),
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        createErrorResponse(400, "File is empty or corrupted", "EMPTY_FILE"),
        { status: 400 }
      )
    }
    
    const buffer = Buffer.from(arrayBuffer)
    console.log(`File uploaded: ${file.name}, ${buffer.length} bytes, type: ${file.type}`)

    // Text extraction for different file types
    let extractedText = ""
    let wordCount = 0
    let processingMethod = "basic"
    
    if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|csv)$/i)) {
      // Direct text extraction for text files (FREE)
      try {
        extractedText = buffer.toString('utf-8')
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
        processingMethod = "direct"
        console.log(`Text extracted directly: ${wordCount} words`)
      } catch (textError) {
        console.warn(`Text extraction failed for ${file.name}:`, textError)
        extractedText = ""
        wordCount = 0
      }
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Mark PDF for processing - don't try to parse here to avoid errors
      try {
        console.log(`PDF uploaded: ${file.name} - will be processed separately`)
        extractedText = "[PDF content - processing required]"
        wordCount = 0
        processingMethod = "pdf-upload"
      } catch (pdfError) {
        console.warn(`PDF upload failed for ${file.name}:`, pdfError)
        extractedText = ""
        wordCount = 0
        processingMethod = "basic"
      }
    } else if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
      // Use Textract for image files ($0.0015 per page)
      try {
        console.log(`Processing image with Textract: ${file.name}`)
        extractedText = "[Image content - Textract processing required]"
        wordCount = 0
        processingMethod = "textract"
        console.log(`Image marked for Textract processing`)
      } catch (textractError) {
        console.warn(`Textract processing failed for ${file.name}:`, textractError)
        extractedText = ""
        wordCount = 0
        processingMethod = "basic"
      }
    }

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store file data with proper typing
    const fileData: GlobalFileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer.toString("base64"),
      uploadedAt: new Date().toISOString(),
      
      // Basic processing info
      processed: false,
      processingError: null,
      warnings: [],
      
      // Content (filled during upload for text files)
      extractedText: extractedText,
      wordCount: wordCount,
      pages: 1,
      
      // Metadata
      metadata: {
        processingVersion: "2.0.0",
        processingMethod: processingMethod as any,
        confidence: processingMethod === "direct" ? 1.0 : 
                   processingMethod === "pdf-parse-fixed" ? 1.0 : 0.5,
        note: processingMethod === "direct" ? "Text extracted during upload" : 
              processingMethod === "pdf-parse-fixed" ? "PDF processed with fixed parser" :
              processingMethod === "textract" ? "File uploaded, Textract processing required" :
              "File uploaded successfully, ready for processing"
      },
      userId: userContext.userId || undefined
    }

    // Store in global memory using shared utility
    setFileInGlobalStorage(fileId, fileData)
    
    // Persist raw file to Supabase Storage when configured
    let storagePath: string | null = null
    const contentType = file.type || 'application/octet-stream'
    try {
      const client = supabaseAdmin || supabase
      if (client) {
        const bucket = 'files'
        const userSegment = userId || 'guest'
        const path = `${userSegment}/${fileId}/${encodeURIComponent(file.name)}`
        const { error } = await (client as any).storage.from(bucket).upload(path, buffer, {
          contentType,
          upsert: true
        })
        if (!error) storagePath = `${bucket}/${path}`
      }
    } catch (e) {
      console.warn('Storage upload skipped/failed:', e)
    }
    
    // Optionally save to database with embeddings (only for authenticated users)
    let saved = false
    let documentId: string | null = null
    if (saveToDatabase && extractedText && userContext.shouldSaveToDatabase) {
      try {
        const processedDocument = await documentService.processAndSaveDocument(
          extractedText, 
          file.name, 
          userContext.userId!,
          file.type
        )
        saved = true
        documentId = processedDocument.id
      } catch (e) {
        console.warn('Save to database error:', e)
        fileData.processingError = e instanceof Error ? e.message : 'Database save failed'
      }
    } else if (saveToDatabase && userContext.isGuest) {
      console.warn('Guest user attempted to save to database - operation blocked')
    }

    // Attach storage metadata to in-memory record for downstream fetch/signed URLs
    try {
      const storage = initializeGlobalStorage()
      const existing = storage.get(fileId)
      if (existing) {
        existing.storagePath = storagePath
        existing.contentType = contentType
        storage.set(fileId, existing)
      }
    } catch {}

    // Note: localStorage will be handled client-side after successful upload

    // Return success response
    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      wordCount: wordCount,
      extractedText: extractedText ? extractedText.substring(0, 200) + (extractedText.length > 200 ? "..." : "") : "",
      saved,
      storagePath,
      contentType,
      documentId,
      message: processingMethod === "direct" ? "File uploaded and text extracted successfully" : 
               processingMethod === "textract" ? "File uploaded successfully. Text extraction requires AWS Textract processing." :
               "File uploaded successfully and ready for processing"
    })

  } catch (error) {
    console.error("Upload error:", error)
    
    if (error instanceof APIError) {
      return NextResponse.json(
        createErrorResponse(error.statusCode, error.message, error.code, error.details),
        { status: error.statusCode }
      )
    }
    
    // Provide more specific error messages
    let errorMessage = "Upload failed"
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes("File too large")) {
        errorMessage = "File size exceeds limit"
        statusCode = 400
      } else if (error.message.includes("Unsupported file type")) {
        errorMessage = "File type not supported"
        statusCode = 400
      } else if (error.message.includes("No file provided")) {
        errorMessage = "No file was provided"
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      createErrorResponse(statusCode, errorMessage, "UPLOAD_ERROR", {
        suggestion: "Please check the file size and type, then try again"
      }),
      { status: statusCode }
    )
  }
}

// GET endpoint to retrieve uploaded files (for debugging)
export async function GET() {
  try {
    const storage = initializeGlobalStorage()
    const files = Array.from(storage.values()).map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: file.uploadedAt,
      processed: file.processed
    }))
    
    return NextResponse.json({
      success: true,
      files,
      count: files.length
    })
  } catch (error) {
    console.error("GET files error:", error)
    return NextResponse.json({ 
      error: "Failed to retrieve files" 
    }, { status: 500 })
  }
}
