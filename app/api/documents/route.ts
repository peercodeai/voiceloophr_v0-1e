import { NextRequest, NextResponse } from 'next/server'
import { isGuestUser, GUEST_USER_ID } from '@/lib/auth'
import { createErrorResponse } from '@/lib/validation'
import { documentService } from '@/services/documentService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        createErrorResponse(400, 'Invalid pagination parameters', 'INVALID_PAGINATION'),
        { status: 400 }
      )
    }

    // Try to get documents from database if user is authenticated
    if (userId && !isGuestUser(userId)) {
      try {
        const result = await documentService.getDocumentsForUser(userId, page, pageSize)
        
        return NextResponse.json({ 
          success: true, 
          documents: result.documents,
          pagination: {
            currentPage: page,
            pageSize,
            totalDocuments: result.totalCount,
            totalPages: result.totalPages
          }
        })
      } catch (error) {
        console.error('Database fetch error:', error)
        return NextResponse.json(
          createErrorResponse(500, 'Failed to fetch documents', 'DATABASE_ERROR', error),
          { status: 500 }
        )
      }
    }

    // If user is guest, return empty array
    // The dashboard will fall back to localStorage data
    return NextResponse.json({ 
      success: true, 
      documents: [],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        totalDocuments: 0,
        totalPages: 0
      }
    })
  } catch (err) {
    console.error('Documents GET error:', err)
    return NextResponse.json(
      createErrorResponse(500, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}


