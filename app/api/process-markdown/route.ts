import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ 
        error: "Missing fileId", 
        details: "File ID is required for processing"
      }, { status: 400 })
    }

    // Get file from memory storage
    global.uploadedFiles = global.uploadedFiles || new Map()
    const fileData = global.uploadedFiles.get(fileId)

    if (!fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if it's a Markdown file
    const isMarkdownFile = fileData.name.toLowerCase().endsWith('.md') || 
                          fileData.type.includes('markdown') ||
                          fileData.type === 'application/octet-stream' && fileData.name.toLowerCase().endsWith('.md')

    if (!isMarkdownFile) {
      return NextResponse.json({ 
        error: "Not a Markdown file", 
        details: "This endpoint is for Markdown files only"
      }, { status: 400 })
    }

    // Create a simple summary for Markdown files
    const wordCount = fileData.extractedText.split(/\s+/).filter(word => word.length > 0).length
    const charCount = fileData.extractedText.length
    const summary = `Markdown document processed successfully. Contains ${wordCount} words and ${charCount} characters. Ready for analysis and search.`

    // Update file data with processing results
    const processedData = {
      ...fileData,
      summary,
      processed: true,
      status: 'completed',
      processedAt: new Date().toISOString(),
      aiProcessed: false, // Mark as not AI processed since we skipped AI analysis
      aiProcessingError: null,
      processingMethod: 'markdown-direct'
    }

    // Store updated data
    global.uploadedFiles.set(fileId, processedData)

    console.log(`✅ Markdown file processed successfully: ${fileData.name}`)
    console.log(`📊 Word count: ${wordCount}, Character count: ${charCount}`)

    return NextResponse.json({
      success: true,
      fileId,
      extractedText: fileData.extractedText,
      summary,
      wordCount,
      charCount,
      status: 'completed',
      processed: true,
      metadata: {
        type: 'Markdown Document',
        wordCount,
        characterCount: charCount,
        processingMethod: 'markdown-direct',
        confidence: 1.0
      }
    })
  } catch (error) {
    console.error("Markdown processing error:", error)
    return NextResponse.json({ 
      error: "Markdown processing failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}


