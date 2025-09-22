import { NextRequest, NextResponse } from 'next/server'
import { RAGService } from '@/lib/ragService'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      documentId, 
      fileName, 
      text, 
      userId, 
      openaiKey 
    } = body

    if (!documentId || !fileName || !text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: documentId, fileName, text' 
      }, { status: 400 })
    }

    // Validate user authentication if userId is provided
    if (userId && supabaseAdmin) {
      try {
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (userError || !user.user) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid user ID' 
          }, { status: 401 })
        }
      } catch (authError) {
        console.warn('User validation failed, proceeding without user context:', authError)
      }
    }

    // Process document for semantic search
    const result = await RAGService.processDocumentForSearch(
      documentId,
      fileName,
      text,
      userId,
      openaiKey
    )

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to process document for search' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Document processed successfully for semantic search. Created ${result.chunks.length} chunks.`,
      chunks: result.chunks,
      documentId,
      fileName
    })

  } catch (error) {
    console.error('Save for search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
