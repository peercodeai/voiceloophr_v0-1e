"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface FileTypeInfo {
  supportedTypes: string[]
  typeDescriptions: Record<string, string>
}

export default function FileTypeInfo() {
  const [fileTypes, setFileTypes] = useState<FileTypeInfo | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadFileTypes = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/process-file')
        if (response.ok) {
          const data = await response.json()
          setFileTypes(data)
        }
      } catch (error) {
        console.error('Failed to load file types:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFileTypes()
  }, [])

  if (!fileTypes) {
    return null
  }

  const categories = {
    'Google Workspace': ['.gdoc', '.gsheet', '.gslides'],
    'Microsoft Office': ['.docx', '.xlsx', '.pptx'],
    'Legacy Office': ['.doc', '.xls', '.ppt'],
    'Text Formats': ['.txt', '.md', '.csv'],
    'Documents': ['.pdf'],
    'Audio/Video': ['.wav', '.mp4']
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Google Workspace':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'Microsoft Office':
        return <FileText className="h-4 w-4 text-blue-700" />
      case 'Legacy Office':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'Text Formats':
        return <FileText className="h-4 w-4 text-purple-600" />
      case 'Documents':
        return <FileText className="h-4 w-4 text-red-600" />
      case 'Audio/Video':
        return <FileText className="h-4 w-4 text-green-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className="p-4 border-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Supported File Types</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {Object.entries(categories).map(([category, extensions]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <span className="text-xs font-medium text-foreground">{category}</span>
              </div>
              <div className="flex flex-wrap gap-1 ml-6">
                {extensions.map(ext => (
                  <Badge
                    key={ext}
                    variant="outline"
                    className="text-xs font-light border-primary/30 bg-primary/5 text-primary"
                  >
                    {ext}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          
          <div className="pt-2 border-t border-primary/20">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tips:</strong> For best results with Google Workspace files, 
              export them as Office formats before uploading. For audio/video files, 
              use the Textract processing option to extract speech content.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
