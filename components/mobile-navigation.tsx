"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings, Calendar, Menu, X, User, LogOut, Upload, Search, MessageCircle, Home, Files } from "lucide-react"
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavigationProps {
  showHomeButton?: boolean
  showDashboardButton?: boolean
}

export function MobileNavigation({ 
  showHomeButton = true,
  showDashboardButton = true
}: NavigationProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
        setUserEmail((user?.email as string) || (user?.user_metadata?.email as string) || null)
        const pic = (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture || null
        setAvatarUrl(pic || null)
      } catch {}
    }
    loadUser()
  }, [])

  const userLabel = useMemo(() => {
    if (userEmail) return userEmail
    if (userId) return `${userId.slice(0,6)}…${userId.slice(-4)}`
    return null
  }, [userEmail, userId])

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowser()
      if (supabase) {
        await supabase.auth.signOut()
        window.location.href = '/'
      }
    } catch {}
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.mobile-menu-container')) {
          setIsMobileMenuOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileMenuOpen])

  return (
    <header className="border-b border-thin border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left area: user avatar */}
          <div className="flex items-center">
            {userId && (
              <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-border/50 bg-background/60">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User" width={24} height={24} className="rounded-full"
                       referrerPolicy="no-referrer" onError={() => setAvatarUrl(null)} />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                    {(userLabel || 'U').slice(0,2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground max-w-[140px] truncate" title={userLabel || undefined}>
                  {userLabel}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showHomeButton && (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/">
                  Home
                </Link>
              </Button>
            )}
            
            {showDashboardButton && (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              </Button>
            )}
            
            <ThemeToggle />
            
            {userId ? (
              <>
                <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-montserrat-light bg-transparent"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/settings">
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mobile-menu-container">
          <div className="flex items-center justify-between">
            {/* Mobile Logo/Brand */}
            <div className="flex items-center gap-3">
              {userId && (
                <div className="flex items-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User" width={32} height={32} className="rounded-full"
                         referrerPolicy="no-referrer" onError={() => setAvatarUrl(null)} />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      {(userLabel || 'U').slice(0,2).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-montserrat-light text-lg font-medium leading-tight">VoiceLoop</span>
                {userId && userLabel && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {userLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="p-2 bg-transparent border-border/50 hover:bg-muted/50"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute left-0 right-0 top-full bg-background/95 backdrop-blur border-b border-border/50 shadow-lg">
              <div className="container mx-auto px-4 py-4">
                <div className="flex flex-col gap-2">
                  {showHomeButton && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-montserrat-light justify-start h-12 text-left" 
                      asChild
                    >
                      <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                        <Home className="h-5 w-5 mr-3" />
                        Home
                      </Link>
                    </Button>
                  )}
                  
                  {showDashboardButton && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-montserrat-light justify-start h-12 text-left" 
                      asChild
                    >
                      <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                        <LayoutDashboard className="h-5 w-5 mr-3" />
                        Dashboard
                      </Link>
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-montserrat-light justify-start h-12 text-left" 
                    asChild
                  >
                    <Link href="/upload" onClick={() => setIsMobileMenuOpen(false)}>
                      <Upload className="h-5 w-5 mr-3" />
                      Upload Documents
                    </Link>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-montserrat-light justify-start h-12 text-left" 
                    asChild
                  >
                    <Link href="/search" onClick={() => setIsMobileMenuOpen(false)}>
                      <Search className="h-5 w-5 mr-3" />
                      Search Documents
                    </Link>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-montserrat-light justify-start h-12 text-left" 
                    asChild
                  >
                    <Link href="/chat" onClick={() => setIsMobileMenuOpen(false)}>
                      <MessageCircle className="h-5 w-5 mr-3" />
                      AI Voice Chat
                      </Link>
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-montserrat-light justify-start h-12 text-left" 
                      asChild
                    >
                      <Link href="/document-query" onClick={() => setIsMobileMenuOpen(false)}>
                        <Files className="h-5 w-5 mr-3" />
                        Document Query
                      </Link>
                    </Button>
                    
                    <div className="border-t border-border/50 my-2"></div>
                  
                  {userId ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-montserrat-light justify-start h-12 text-left" 
                        asChild
                      >
                        <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                          <Settings className="h-5 w-5 mr-3" />
                          Settings
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-montserrat-light justify-start h-12 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          handleSignOut()
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-montserrat-light justify-start h-12 text-left" 
                      asChild
                    >
                      <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                        <User className="h-5 w-5 mr-3" />
                        Sign In / Register
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
