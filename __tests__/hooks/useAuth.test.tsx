import { renderHook, waitFor } from '@testing-library/react'
import { useAuth, useGuestMode } from '../../hooks/useAuth'
import { getSupabaseBrowser } from '../../lib/supabase-browser'

// Mock the Supabase browser client
jest.mock('../../lib/supabase-browser', () => ({
  getSupabaseBrowser: jest.fn()
}))

const mockGetSupabaseBrowser = getSupabaseBrowser as jest.MockedFunction<typeof getSupabaseBrowser>

describe('useAuth', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSupabaseBrowser.mockReturnValue(mockSupabaseClient as any)
  })

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle successful user authentication', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle authentication failure', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Authentication failed')
    })

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle missing Supabase client', async () => {
    mockGetSupabaseBrowser.mockReturnValue(null)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle auth state changes', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }

    let authStateChangeCallback: (event: string, session: any) => void

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } }
      }
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate auth state change
    authStateChangeCallback('SIGNED_IN', { user: mockUser })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})

describe('useGuestMode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return guest mode when no user is authenticated', () => {
    const { result } = renderHook(() => useGuestMode())

    expect(result.current.isGuest).toBe(true)
    expect(result.current.userId).toBe('00000000-0000-0000-0000-000000000000')
  })

  it('should return authenticated mode when user is present', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }

    mockGetSupabaseBrowser.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } }
        })
      }
    } as any)

    const { result } = renderHook(() => useGuestMode())

    expect(result.current.isGuest).toBe(false)
    expect(result.current.userId).toBe('user-123')
  })
})
