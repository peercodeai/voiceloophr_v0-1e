"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const signInWithProvider = async (provider: 'google' | 'linkedin_oidc' | 'azure') => {
    setLoading(true)
    setMessage('')
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      setMessage('Auth not configured')
      setLoading(false)
      return
    }
    const scopes = provider === 'google'
      ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
      : provider === 'linkedin_oidc'
      ? 'openid profile email'
      : 'openid email profile offline_access https://graph.microsoft.com/calendars.read'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}`,
        scopes,
        queryParams: provider === 'azure' 
          ? { prompt: 'consent' }
          : { prompt: 'consent select_account', access_type: 'offline' }
      }
    })
    if (error) setMessage(error.message)
    setLoading(false)
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-light text-center">Sign in</h1>
        <Button disabled={loading} onClick={() => signInWithProvider('google')} className="w-full">Continue with Google</Button>
        <Button disabled={loading} onClick={() => signInWithProvider('linkedin_oidc')} className="w-full" variant="outline">Continue with LinkedIn</Button>
        <Button disabled={loading} onClick={() => signInWithProvider('azure')} className="w-full" variant="outline">Continue with Microsoft</Button>
        {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
        <p className="text-center text-sm"><Link href="/">Back to Home</Link></p>
      </div>
    </div>
  )
}


