"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export default function PlaceholderDocuments() {
  const handleSignIn = () => {
    // This will be handled by the parent component or auth modal
    window.dispatchEvent(new CustomEvent('showAuthModal'))
  }

  return (
    <Card className="p-6 border-thin">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-light text-foreground">Recent Documents</h3>
      </div>
      
      {/* Documents placeholder content */}
      <div className="space-y-4">
        {/* Placeholder document items */}
        <div className="flex items-center gap-3 p-3 border border-border/30 rounded-lg bg-muted/20">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted-foreground/10 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border border-border/30 rounded-lg bg-muted/20">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-muted-foreground/10 rounded w-1/3"></div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border border-border/30 rounded-lg bg-muted/20">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-4/5 mb-2"></div>
            <div className="h-3 bg-muted-foreground/10 rounded w-2/5"></div>
          </div>
        </div>
      </div>
      
      {/* Sign in prompt */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg text-center">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-light mb-3">
          Sign in to view and manage your uploaded documents
        </p>
        <Button 
          onClick={handleSignIn}
          className="font-montserrat-light"
        >
          Sign In to Load Documents
        </Button>
      </div>
    </Card>
  )
}
