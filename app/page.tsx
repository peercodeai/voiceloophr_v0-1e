"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Zap, LayoutDashboard, Cloud } from "lucide-react"
import { useEffect, useState } from 'react'
import { AuthModal } from '@/components/auth-modal'
import LogoShowcase from '@/components/logo-showcase'
import { MobileNavigation } from '@/components/mobile-navigation'

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
      <MobileNavigation showHomeButton={false} />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6 sm:mb-8">
            <div className="block dark:hidden">
              <Image
                src="https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png"
                alt="VoiceLoop"
                width={180}
                height={180}
                className="mx-auto mb-6 sm:mb-8 rounded-2xl sm:w-[240px] sm:h-[240px]"
                priority
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
                alt="VoiceLoop"
                width={180}
                height={180}
                className="mx-auto mb-6 sm:mb-8 rounded-2xl sm:w-[240px] sm:h-[240px]"
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

          <p className="text-xl text-muted-foreground font-montserrat-light mb-6 max-w-3xl mx-auto text-pretty">
            The intelligent document analysis platform that revolutionizes how you work with files. 
            Upload any document and engage in natural voice conversations with AI-powered summaries, 
            semantic search, and instant insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm font-montserrat-light">Multi-format Support</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm font-montserrat-light">AI-Powered Analysis</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm font-montserrat-light">Voice Conversations</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Button size="lg" className="font-montserrat-light text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" asChild>
              <Link href="/upload">
                Get Started
                <Zap className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="font-montserrat-light text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-transparent w-full sm:w-auto" asChild>
              <Link href="/dashboard">
                View Dashboard
                <LayoutDashboard className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>

          {/* Auth CTA removed in favor of single nav button */}
        </div>
      </section>


      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-montserrat-light text-foreground mb-4">
              Everything You Need for Document Intelligence
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground font-montserrat-light max-w-2xl mx-auto px-4">
              From simple text extraction to advanced AI analysis, VoiceLoop HR provides comprehensive tools for modern document workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Instant Processing</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Upload documents and get immediate AI-powered analysis with summaries, key insights, and actionable recommendations.
              </p>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Smart Dashboard</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Centralized document management with semantic search, voice chat, and intelligent organization across all your files.
              </p>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Seamless Integration</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Connect with Google Drive, LinkedIn, and Microsoft services for a unified document experience across platforms.
              </p>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-primary text-xl">🎯</span>
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Semantic Search</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Find information using natural language queries. Ask questions in plain English and get relevant document sections instantly.
              </p>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-primary text-xl">🔊</span>
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Voice Conversations</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Talk to your documents using voice input and get spoken responses. Perfect for hands-free document interaction.
              </p>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-primary text-xl">🛡️</span>
              </div>
              <h3 className="text-xl font-montserrat-light mb-3">Secure & Private</h3>
              <p className="text-muted-foreground font-montserrat-light">
                Enterprise-grade security with local storage options, encrypted data transmission, and complete user control over information.
              </p>
            </div>
          </div>
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
