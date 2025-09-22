import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import VoiceChat from "@/components/voice-chat"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />

      {/* Chat Content */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-light text-foreground mb-2">AI Voice Chat</h1>
            <p className="text-muted-foreground font-light">Have a conversation with AI using voice or text</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <VoiceChat />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
