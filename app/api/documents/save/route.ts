import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      name, 
      type, 
      size, 
      extractedText, 
      summary, 
      processingMethod, 
      userId 
    } = body

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not configured' 
      }, { status: 500 })
    }

    // Ensure we use a valid UUID for the primary key. If client sent a non-UUID id, generate one.
    const isUuid = typeof id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)
    const docId = isUuid ? id : crypto.randomUUID()

    // Save document to database
    let { data, error } = await supabaseAdmin
      .from('documents')
      .upsert({
        id: docId,
        file_name: name,
        mime_type: type,
        content: extractedText,
        summary: summary,
        processing_method: processingMethod,
        user_id: userId,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id' 
      })
      .select('*')

    if (error) {
      console.warn('Primary upsert failed, retrying with minimal columns:', error)
      // Fallback with minimal set of columns present in most schemas
      const fallback = await supabaseAdmin
        .from('documents')
        .upsert({
          id: docId,
          file_name: name,
          content: extractedText
        }, { onConflict: 'id' })
        .select('*')

      if (fallback.error) {
        console.error('Save document error (fallback failed):', fallback.error)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to save document',
          details: (fallback.error as any)?.message || fallback.error
        }, { status: 500 })
      }
      data = fallback.data
    }

    return NextResponse.json({ 
      success: true, 
      document: data,
      id: docId
    })
  } catch (err) {
    console.error('Save document error:', err)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
