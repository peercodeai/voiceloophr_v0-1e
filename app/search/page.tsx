import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import SearchInterface from "@/components/search-interface"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />

      {/* Search Content */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-light text-foreground mb-2">Semantic Search</h1>
            <p className="text-muted-foreground font-light">
              Find information across all your documents using natural language
            </p>
          </div>

          <SearchInterface />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
