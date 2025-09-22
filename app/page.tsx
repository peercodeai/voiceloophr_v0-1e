"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Zap, LayoutDashboard } from "lucide-react"
import { useEffect, useState } from 'react'
import { AuthModal } from '@/components/auth-modal'
import LogoShowcase from '@/components/logo-showcase'
import { Navigation } from '@/components/navigation'

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [altWordIdx, setAltWordIdx] = useState(0)
  const altWords = ["Ideas", "Summaries", "Conversations", "Appointments", "Insights"]

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch {}
    }
    loadUser()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setAltWordIdx(i => (i + 1) % altWords.length), 2200)
    return () => clearInterval(t)
  }, [])

  const handleOAuth = async (provider: 'google' | 'linkedin_oidc' | 'azure') => {
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const redirectTo = typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback` : undefined
      const scopes = provider === 'google'
        ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
        : provider === 'linkedin_oidc'
        ? 'openid profile email'
        : 'openid email profile offline_access https://graph.microsoft.com/calendars.read'
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes,
          queryParams: provider === 'azure' 
            ? { prompt: 'consent' }
            : { prompt: 'consent select_account', access_type: 'offline' }
        }
      })
    } catch (e) {
      console.error('Auth error:', e)
    }
  }

  const handleEmailMagic = async () => {
    const email = prompt('Enter your email for a magic link')
    if (!email) return
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined } })
      alert('Check your email for the sign-in link.')
    } catch (e) {
      console.error('Email sign-in error:', e)
    }
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation showHomeButton={false} />

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <div className="block dark:hidden">
              <Image
                src="https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png"
                alt="VoiceLoop"
                width={240}
                height={240}
                className="mx-auto mb-8 rounded-2xl"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
                alt="VoiceLoop"
                width={240}
                height={240}
                className="mx-auto mb-8 rounded-2xl"
                priority
              />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-montserrat-light text-foreground mb-6 text-balance">
            Transform Documents into
            <br className="sm:hidden" />
            <span className="ml-0 sm:ml-2 px-2 rounded bg-transparent text-foreground/70 dark:text-secondary inline-block">
              {altWords[altWordIdx]}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground font-montserrat-light mb-8 max-w-2xl mx-auto text-pretty">
            Upload any document and engage in intelligent voice conversations with AI-powered summaries
            and semantic search.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="font-montserrat-light text-lg px-8 py-6" asChild>
              <Link href="/upload">
                Get Started
                <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="font-montserrat-light text-lg px-8 py-6 bg-transparent" asChild>
              <Link href="/dashboard">
                View Dashboard
                <LayoutDashboard className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Auth CTA removed in favor of single nav button */}
        </div>
      </section>


      {/* Technology Showcase */}
      <section className="py-20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-montserrat-medium text-center mb-6 text-balance text-muted-foreground">Powered by Leading AI Technologies</h2>
          <LogoShowcase />
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-thin border-border/50 py-8 px-6">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground font-montserrat-light">
            © 2025 VoiceLoop. Transform documents into conversations.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
