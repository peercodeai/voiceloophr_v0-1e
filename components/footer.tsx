"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-thin border-border/50 py-8 px-6 mt-auto">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
          © 2025 VoiceLoop. Transform documents into conversations.
        </p>
        <div className="flex justify-center gap-6">
          <Link 
            href="/privacy-policy.html" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-montserrat-light"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/settings" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-montserrat-light"
          >
            Settings
          </Link>
        </div>
      </div>
    </footer>
  )
}
