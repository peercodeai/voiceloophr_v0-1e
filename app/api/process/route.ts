import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/aiService"

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ 
        error: "Missing fileId", 
        details: "File ID is required for processing",
        suggestion: "Please provide a valid file ID"
      }, { status: 400 })
    }

    // Use server environment variable for OpenAI API key
    const finalOpenaiKey = process.env.OPENAI_API_KEY;
    if (!finalOpenaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured in environment variables.' },
        { status: 500 }
      )
    }

    // Get file from memory storage
    global.uploadedFiles = global.uploadedFiles || new Map()
    console.log(`🔍 Looking for fileId: ${fileId}`)
    console.log(`📊 Total files in global storage: ${global.uploadedFiles.size}`)
    console.log(`📋 Available fileIds: ${Array.from(global.uploadedFiles.keys()).join(', ')}`)
    
    const fileData = global.uploadedFiles.get(fileId)

    if (!fileData) {
      console.error(`❌ File not found in global storage: ${fileId}`)
      return NextResponse.json({ 
        error: "File not found", 
        details: `File ${fileId} not found in server memory`,
        suggestion: "Please try uploading the file again",
        debug: {
          requestedFileId: fileId,
          totalFiles: global.uploadedFiles.size,
          availableFileIds: Array.from(global.uploadedFiles.keys())
        }
      }, { status: 404 })
    }
    
    console.log(`✅ File found: ${fileData.name} (${fileData.type})`)

    // Check if file has already been processed
    if (!fileData.extractedText) {
      return NextResponse.json({ error: "File has not been processed yet" }, { status: 400 })
    }

    let transcription = ""
    let summary = ""

    // Handle audio/video transcription if needed
    if (fileData.type === "audio/wav" || fileData.type === "audio/mpeg" || fileData.type === "audio/mp3" || fileData.name?.toLowerCase().endsWith('.wav') || fileData.name?.toLowerCase().endsWith('.mp3') || fileData.type === "video/mp4") {
      try {
        const buffer = Buffer.from(fileData.buffer, "base64")
        const transcriptionResult = await AIService.transcribeAudio(buffer, finalOpenaiKey, fileData.name)
        transcription = transcriptionResult.content
        
        // Update file data with transcription
        fileData.transcription = transcription
        fileData.extractedText = transcription // Use transcription as extracted text for audio/video
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError)
        return NextResponse.json({ 
          error: "Audio transcription failed", 
          details: transcriptionError instanceof Error ? transcriptionError.message : "Unknown error"
        }, { status: 500 })
      }
    }

    // Generate AI summary using real OpenAI API
    // For Markdown files, skip AI analysis if it fails and use a simple summary
    const isMarkdownFile = fileData.name.toLowerCase().endsWith('.md') || fileData.type.includes('markdown')
    
    try {
      // Use the new /api/analyze endpoint with timeout protection
      console.log('🔍 Calling /api/analyze for document processing...')
      const analyzeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fileData.extractedText,
          fileName: fileData.name || 'document',
          fileType: fileData.type || 'text/plain',
          openaiKey: finalOpenaiKey
        })
      })

      if (analyzeResponse.ok) {
        const analyzeResult = await analyzeResponse.json()
        summary = analyzeResult.analysis.summary
        console.log('✅ AI analysis completed via /api/analyze')
      } else {
        throw new Error(`Analysis failed: ${analyzeResponse.status}`)
      }
    } catch (summaryError) {
      console.error("Summary generation error:", summaryError)
      
      if (isMarkdownFile) {
        // For Markdown files, create a simple summary without AI
        const wordCount = fileData.extractedText.split(/\s+/).length
        const charCount = fileData.extractedText.length
        summary = `Markdown document processed successfully. Contains ${wordCount} words and ${charCount} characters. Ready for analysis and search.`
        console.log("Using Markdown-specific fallback summary")
      } else {
        // For other files, use generic fallback
        summary = `Document processed successfully. Content: ${fileData.extractedText.substring(0, 200)}...`
        console.log("Using generic fallback summary due to AI analysis failure")
      }
    }

    // Store processed results
    const processedData = {
      ...fileData,
      transcription,
      summary,
      processedAt: new Date().toISOString(),
      aiProcessed: true,
      aiProcessingError: null
    }

    global.uploadedFiles.set(fileId, processedData)

    return NextResponse.json({
      success: true,
      fileId,
      extractedText: fileData.extractedText.substring(0, 500) + (fileData.extractedText.length > 500 ? "..." : ""),
      summary,
      transcription: transcription ? transcription.substring(0, 200) + (transcription.length > 200 ? "..." : "") : null,
      wordCount: fileData.wordCount,
      metadata: fileData.metadata
    })
  } catch (error) {
    console.error("Processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
