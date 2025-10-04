"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true)
    setMessage('')
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      setMessage('Auth not configured')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) setMessage(error.message)
    setLoading(false)
  }


  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      signInWithEmail(email, password)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-light text-center">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <Button disabled={loading} type="submit" className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
        <p className="text-center text-sm"><Link href="/">Back to Home</Link></p>
      </div>
    </div>
  )
}


