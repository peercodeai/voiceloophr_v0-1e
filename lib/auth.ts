import { NextRequest } from 'next/server'

// Guest user identifier - using a special UUID format to distinguish from real users
export const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000'

// Check if a user ID is a guest user
export function isGuestUser(userId: string | undefined | null): boolean {
  return !userId || userId === 'guest-user' || userId === GUEST_USER_ID
}

// Generate a proper UUID for guest users (client-side only)
export function generateGuestUserId(): string {
  return GUEST_USER_ID
}

// Validate user ID format
export function isValidUserId(userId: string | undefined | null): boolean {
  if (!userId) return false
  
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(userId)
}

// Get user ID from request headers or return guest ID
export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.headers.get('x-user-id') || request.headers.get('authorization')
  
  if (!userId || isGuestUser(userId)) {
    return GUEST_USER_ID
  }
  
  return userId
}

// Authentication middleware for API routes
export function requireAuth(handler: (req: NextRequest, res: any, userId: string) => Promise<any>) {
  return async (req: NextRequest, res: any) => {
    const userId = getUserIdFromRequest(req)
    
    if (isGuestUser(userId)) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required for this operation',
        code: 'AUTHENTICATION_REQUIRED'
      })
    }
    
    return handler(req, res, userId)
  }
}

// Guest-safe database operations
export function shouldSaveToDatabase(userId: string): boolean {
  return !isGuestUser(userId)
}

// Get user context for database operations
export function getUserContext(userId: string | undefined | null) {
  const isGuest = isGuestUser(userId)
  const validUserId = isGuest ? null : userId
  
  return {
    isGuest,
    userId: validUserId,
    shouldSaveToDatabase: !isGuest
  }
}
