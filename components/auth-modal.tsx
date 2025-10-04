"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const handler = (e: MessageEvent) => {
      if (e?.data?.type === 'supabase-auth' && e?.data?.ok) {
        onClose()
        try { window.location.reload() } catch {}
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [open, onClose])

  if (!open) return null

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      onClose()
    } catch (e) {
      console.error('Sign in error:', e)
      setError(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      signInWithEmail(email, password)
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-sm p-6 bg-card text-card-foreground shadow-xl border-border">
        <div className="flex flex-col items-center text-center space-y-4">
          <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={56} height={56} className="rounded" />
          <h2 className="text-xl font-light">Sign in to VoiceLoop</h2>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button disabled={loading} type="submit" className="w-full font-light">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <Button variant="ghost" className="w-full font-light" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}


