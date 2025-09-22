import { type NextRequest, NextResponse } from "next/server"
import { clearGlobalStorage, clearUserFilesFromGlobalStorage } from '@/lib/global-storage'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, clearAll = false } = body

    if (clearAll) {
      // Clear all global storage (admin only)
      clearGlobalStorage()
      return NextResponse.json({ 
        success: true, 
        message: "All global storage cleared" 
      })
    }

    if (userId) {
      // Clear only user-specific files
      clearUserFilesFromGlobalStorage(userId)
      return NextResponse.json({ 
        success: true, 
        message: `Files cleared for user ${userId}` 
      })
    }

    return NextResponse.json({ 
      error: "Missing userId or clearAll flag" 
    }, { status: 400 })

  } catch (error) {
    console.error('Error clearing storage:', error)
    return NextResponse.json({ 
      error: "Failed to clear storage" 
    }, { status: 500 })
  }
}


