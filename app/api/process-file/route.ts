import { NextRequest, NextResponse } from 'next/server'
import { FileProcessor } from '@/lib/file-processors'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Process the file using our FileProcessor
    const processedContent = await FileProcessor.processFile(file)
    
    return NextResponse.json({
      success: true,
      content: processedContent.text,
      metadata: processedContent.metadata,
      message: 'File processed successfully'
    })
    
  } catch (error) {
    console.error('File processing error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({
      error: 'File processing failed',
      details: errorMessage,
      code: 'PROCESSING_ERROR'
    }, { status: 500 })
  }
}

export async function GET() {
  // Return supported file types for frontend reference
  const supportedTypes = FileProcessor.getSupportedFileTypes()
  const typeDescriptions = FileProcessor.getFileTypeDescriptions()
  
  return NextResponse.json({
    supportedTypes,
    typeDescriptions,
    message: 'Supported file types retrieved successfully'
  })
}
