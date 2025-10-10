import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import { Montserrat } from "next/font/google"
import AnalyticsWrapper from "@/components/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700"],
})



export const metadata: Metadata = {
  title: "VoiceLoop HR – AI Document Processing, Voice Chat, Calendar & Search",
  description:
    "Upload, parse, and search documents with AI. Summaries, RAG search, Google Drive imports, Calendar scheduling, and voice chat (OpenAI/ElevenLabs).",
  keywords: [
    'AI document processing',
    'HR document analysis',
    'PDF parser',
    'semantic search',
    'RAG',
    'voice chat',
    'text to speech',
    'speech to text',
    'Google Drive import',
    'Google Calendar integration',
    'Supabase',
    'OpenAI',
    'ElevenLabs'
  ],
  authors: [{ name: 'VoiceLoop' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'VoiceLoop HR – AI Document Processing, Voice Chat, Calendar & Search',
    description:
      'Upload, parse, and search documents with AI. Summaries, RAG search, Google Drive imports, Calendar scheduling, and voice chat.',
    url: 'https://v0-voice-loop-hr-platform.vercel.app',
    siteName: 'VoiceLoop HR',
    images: [
      { url: 'https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png', width: 1200, height: 630 },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceLoop HR – AI Document Processing, Voice Chat, Calendar & Search',
    description:
      'Upload, parse, and search documents with AI. Summaries, RAG search, Google Drive imports, Calendar scheduling, and voice chat.',
    images: ['https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png'],
  },
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/images/voiceloop-logo.png", media: "(prefers-color-scheme: dark)" },
      { url: "https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png", media: "(prefers-color-scheme: light)" },
    ],
    shortcut: [
      { url: "/images/voiceloop-logo.png", media: "(prefers-color-scheme: dark)" },
      { url: "https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png", media: "(prefers-color-scheme: light)" },
    ],
    apple: [
      { url: "/images/voiceloop-logo.png", media: "(prefers-color-scheme: dark)" },
      { url: "https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png", media: "(prefers-color-scheme: light)" },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-montserrat ${inter.variable} ${jetbrainsMono.variable} ${montserrat.variable} antialiased`}>
        <Suspense fallback={null}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </Suspense>
        {/* <AnalyticsWrapper /> */}
      </body>
    </html>
  )
}
