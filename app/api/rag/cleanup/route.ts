import { NextRequest, NextResponse } from 'next/server'
import { RAGService } from '@/lib/ragService'

export async function DELETE(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Clean up RAG data using the RAGService
    await RAGService.deleteDocumentChunks(documentId)

    return NextResponse.json({
      message: 'RAG data cleaned up successfully',
      documentId
    })

  } catch (error) {
    console.error('RAG cleanup error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to clean up RAG data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
