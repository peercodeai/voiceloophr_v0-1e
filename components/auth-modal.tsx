"use client"

import { useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {

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

  const openOAuth = async (provider: 'google' | 'linkedin_oidc' | 'azure') => {
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`
      const scopes = provider === 'google'
        ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly'
        : provider === 'linkedin_oidc'
        ? 'openid profile email'
        : 'openid email profile offline_access https://graph.microsoft.com/calendars.read'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          // Provider-specific scopes
          scopes,
          queryParams: provider === 'azure' 
            ? { prompt: 'consent' }
            : { prompt: 'consent select_account', access_type: 'offline' }
        }
      })
      if (error) throw error
    } catch (e) {
      console.error('OAuth error:', e)
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-sm p-6 bg-card text-card-foreground shadow-xl border-border">
        <div className="flex flex-col items-center text-center space-y-4">
          <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={56} height={56} className="rounded" />
          <h2 className="text-xl font-light">Sign in to VoiceLoop</h2>

          <Button className="w-full font-light" onClick={() => openOAuth('google')}>
            Sign in with Google
          </Button>
          <Button className="w-full font-light" variant="outline" onClick={() => openOAuth('linkedin_oidc')}>
            Sign in with LinkedIn
          </Button>
          <Button className="w-full font-light" variant="outline" onClick={() => openOAuth('azure')}>
            Sign in with Microsoft
          </Button>

          <Button variant="ghost" className="w-full font-light" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}


