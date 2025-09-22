import { NextRequest, NextResponse } from 'next/server'
import { initializeGlobalStorage, getFileFromGlobalStorage } from '@/lib/global-storage'
import { supabaseAdmin, supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Initialize global storage and get file data
    const storage = initializeGlobalStorage()
    const fileData = getFileFromGlobalStorage(fileId)
    
    console.log(`🔍 Looking for fileId: ${fileId}`)
    console.log(`📊 Global storage has ${storage.size} files`)
    console.log(`🔑 Available fileIds: ${Array.from(storage.keys()).join(', ')}`)
    
    if (!fileData) {
      // Try to retrieve from client-side localStorage via a signed echo response
      // Not possible server-side; return detailed 404 to allow client fallback
      console.log(`❌ File not found: ${fileId}`)
      console.log(`📊 Available files in storage:`, Array.from(storage.keys()))
      return NextResponse.json(
        { 
          error: 'File not found',
          requestedFileId: fileId,
          availableFiles: Array.from(storage.keys()),
          storageSize: storage.size
        },
        { status: 404 }
      )
    }

    console.log(`✅ Found file: ${fileData.name} (${fileData.type})`)

    // Attempt to create a signed URL if the file is in Supabase Storage
    let signedUrl: string | null = null
    try {
      const client = supabaseAdmin || supabase
      if (client && fileData.storagePath) {
        const [bucket, ...rest] = String(fileData.storagePath).split('/')
        const path = rest.join('/')
        const { data, error } = await (client as any).storage.from(bucket).createSignedUrl(path, 60 * 60) // 1 hour
        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl
        }
      }
    } catch {}

    // Return file data with buffer and optional signed URL for viewing
    return NextResponse.json({
      success: true,
      file: {
        id: fileData.id,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        buffer: fileData.buffer, // Base64 encoded file data
        storagePath: fileData.storagePath || null,
        contentType: fileData.contentType || fileData.type,
        signedUrl,
        extractedText: fileData.extractedText,
        uploadedAt: fileData.uploadedAt,
        processed: fileData.processed,
        processingMethod: fileData.metadata?.processingMethod,
        wordCount: fileData.wordCount
      }
    })

  } catch (error) {
    console.error('Get file error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 })
    }

    const storage = initializeGlobalStorage()
    const fileData = getFileFromGlobalStorage(fileId)

    // Remove from Supabase Storage if present
    try {
      const client = supabaseAdmin || supabase
      if (client && fileData?.storagePath) {
        const [bucket, ...rest] = String(fileData.storagePath).split('/')
        const path = rest.join('/')
        await (client as any).storage.from(bucket).remove([path])
      }
    } catch (e) {
      console.warn('Storage delete error:', e)
    }

    // Best-effort DB cleanup: delete documents and embeddings by file_name
    try {
      if (supabaseAdmin && fileData?.name) {
        // Find documents with matching file_name
        const { data: docs } = await supabaseAdmin
          .from('documents')
          .select('id')
          .eq('file_name', fileData.name)

        const docIds = (docs || []).map((d: any) => d.id)
        if (docIds.length > 0) {
          // Delete embeddings for those documents
          await supabaseAdmin.from('document_embeddings').delete().in('document_id', docIds)
          // Delete the documents
          await supabaseAdmin.from('documents').delete().in('id', docIds)
        }

        // Also clean RAG chunks if present
        try {
          await supabaseAdmin.from('document_chunks').delete().in('document_id', docIds)
        } catch {}
      }
    } catch (e) {
      console.warn('DB cleanup error:', e)
    }

    // Remove from in-memory storage
    try {
      storage.delete(fileId)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 })
  }
}
