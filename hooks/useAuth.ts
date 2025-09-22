import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { User, AuthState } from '@/lib/types'
import { GUEST_USER_ID } from '@/lib/auth'

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          setUser(null)
          setIsLoading(false)
          return
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
      } catch (error) {
        console.warn('Failed to load user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()

    // Listen for auth changes
    const supabase = getSupabaseBrowser()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user || null)
          setIsLoading(false)
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const isAuthenticated = !!user

  return { user, isLoading, isAuthenticated }
}

export function useGuestMode(): { isGuest: boolean; userId: string } {
  const { user, isLoading } = useAuth()
  
  const isGuest = !user || isLoading
  const userId = user?.id || GUEST_USER_ID
  
  return { isGuest, userId }
}

export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login, but allow guest mode for certain pages
      const currentPath = window.location.pathname
      const guestAllowedPaths = ['/upload', '/dashboard', '/search']
      
      if (!guestAllowedPaths.includes(currentPath)) {
        router.push('/login')
      }
    }
  }, [user, isLoading, isAuthenticated, router])

  return { user, isLoading, isAuthenticated }
}
