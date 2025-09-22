import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import { documentStoreSchema, validateRequest, APIError, createErrorResponse } from '@/lib/validation'
import { getUserContext, isGuestUser } from '@/lib/auth'

// Initialize OpenAI client only when needed (not at build time)
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured in environment variables.');
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, fileName, userId } = validateRequest(documentStoreSchema, body)

    // Check if this is a guest user trying to save to database
    if (isGuestUser(userId)) {
      return NextResponse.json(
        createErrorResponse(401, 'Guest users cannot save documents to the database', 'GUEST_ACCESS_DENIED'),
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        createErrorResponse(500, 'Database not configured', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({ user_id: userId ?? null, file_name: fileName, content })
      .select()
      .single()

    if (docError || !document) {
      console.error('Error storing document:', docError)
      return NextResponse.json(
        createErrorResponse(500, 'Failed to store document', 'DATABASE_ERROR', docError),
        { status: 500 }
      )
    }

    // Get OpenAI client when needed
    const openai = getOpenAIClient()

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content
    })

    const embedding = embeddingResponse.data[0]?.embedding
    if (!embedding) {
      return NextResponse.json(
        createErrorResponse(500, 'Failed to generate embedding', 'EMBEDDING_ERROR'),
        { status: 500 }
      )
    }

    const { error: embeddingError } = await supabaseAdmin
      .from('document_embeddings')
      .insert({ document_id: document.id, embedding })

    if (embeddingError) {
      console.error('Error storing embedding:', embeddingError)
      return NextResponse.json(
        createErrorResponse(500, 'Failed to store document embedding', 'EMBEDDING_STORAGE_ERROR', embeddingError),
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      documentId: document.id, 
      message: 'Document stored and vectorized successfully' 
    })
  } catch (err) {
    console.error('Error in document storage:', err)
    
    if (err instanceof APIError) {
      return NextResponse.json(
        createErrorResponse(err.statusCode, err.message, err.code, err.details),
        { status: err.statusCode }
      )
    }
    
    return NextResponse.json(
      createErrorResponse(500, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}


