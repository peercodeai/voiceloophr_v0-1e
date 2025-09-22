import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getGlobalStorage } from '@/lib/global-storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // First, stop any ongoing processing
    const globalStorage = getGlobalStorage()
    const fileData = globalStorage.get(documentId)
    
    if (fileData && fileData.status === 'processing') {
      console.log(`🛑 Stopping processing for document: ${documentId}`)
      fileData.status = 'cancelled'
      fileData.processingCancelled = true
      fileData.cancelledAt = new Date().toISOString()
      fileData.processingError = 'Processing cancelled during deletion'
      globalStorage.set(documentId, fileData)
    }

    // Clean up RAG data (document chunks and embeddings)
    try {
      const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/rag/cleanup`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: documentId
        })
      })
      if (cleanupResponse.ok) {
        console.log('✅ RAG data cleaned up successfully')
      } else {
        console.warn('⚠️ Failed to clean up RAG data:', await cleanupResponse.text())
      }
    } catch (ragError) {
      console.warn('⚠️ RAG cleanup failed (continuing with document removal):', ragError)
    }

    // Remove from global storage
    if (globalStorage.has(documentId)) {
      globalStorage.delete(documentId)
      console.log(`🗑️ Removed document from global storage: ${documentId}`)
    }

    // Delete the document from the database
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('Database deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete document from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId,
      processingStopped: fileData?.status === 'processing',
      ragDataCleaned: true
    })

  } catch (error) {
    console.error('Document deletion error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
