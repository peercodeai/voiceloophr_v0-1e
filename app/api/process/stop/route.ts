import { type NextRequest, NextResponse } from "next/server"
import { getGlobalStorage } from "@/lib/global-storage"

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ 
        error: "Missing fileId", 
        details: "File ID is required to stop processing",
        suggestion: "Please provide a valid file ID"
      }, { status: 400 })
    }

    // Get file from global storage
    const globalStorage = getGlobalStorage()
    const fileData = globalStorage.get(fileId)

    if (!fileData) {
      return NextResponse.json({ 
        error: "File not found", 
        details: "The specified file could not be found",
        suggestion: "Please check the file ID and try again"
      }, { status: 404 })
    }

    // Check if file is currently processing (be lenient; allow stopping if unknown/missing status)
    if (fileData.status && fileData.status !== 'processing') {
      return NextResponse.json({ 
        error: "File not processing", 
        details: `File is currently in '${fileData.status}' state, not processing`,
        suggestion: "Only files currently being processed can be stopped"
      }, { status: 400 })
    }

    // Stop processing by updating status
    fileData.status = 'cancelled'
    fileData.processingCancelled = true
    fileData.cancelledAt = new Date().toISOString()
    fileData.processingError = 'Processing cancelled by user'
    
    // Update in global storage
    globalStorage.set(fileId, fileData)

    console.log(`🛑 Processing stopped for file: ${fileData.name} (${fileId})`)

    return NextResponse.json({
      success: true,
      message: "Processing stopped successfully",
      fileId: fileId,
      status: 'cancelled',
      cancelledAt: fileData.cancelledAt
    })

  } catch (error) {
    console.error("Error stopping processing:", error)
    return NextResponse.json({ 
      error: "Failed to stop processing", 
      details: error instanceof Error ? error.message : "Unknown error occurred",
      suggestion: "Please try again or contact support if the issue persists"
    }, { status: 500 })
  }
}
