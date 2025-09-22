"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    setMounted(true)
    // Get initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('voiceloop-theme') as 'light' | 'dark' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (theme === 'system') {
      root.classList.toggle('dark', systemPrefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }

    localStorage.setItem('voiceloop-theme', theme)
  }, [theme, mounted])

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent">
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }

  const getIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  const getLabel = () => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    return 'System'
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="font-montserrat-light bg-transparent" 
      onClick={cycleTheme}
      title={`Current theme: ${getLabel()}. Click to cycle through themes.`}
    >
      {getIcon()}
    </Button>
  )
}
