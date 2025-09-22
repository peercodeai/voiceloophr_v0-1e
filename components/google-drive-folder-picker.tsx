"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DriveFolder {
  id: string
  name: string
}

interface GoogleDriveFolderPickerProps {
  open: boolean
  onClose: () => void
  onPicked: (folder: { id: string, name: string }) => void
}

export default function GoogleDriveFolderPicker({ open, onClose, onPicked }: GoogleDriveFolderPickerProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const supabase = getSupabaseBrowser()
        const { data: { session } } = await supabase!.auth.getSession()
        const token = (session as any)?.provider_token
        if (!token) {
          setError('Sign in with Google first to access Drive.')
          return
        }
        const params = new URLSearchParams({
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: 'files(id,name)',
          pageSize: '50',
        })
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || 'Failed to list folders')
        }
        const data = await res.json()
        const list: DriveFolder[] = data.files || []
        // Prepend pseudo root option
        setFolders([{ id: 'root', name: 'My Drive (root)' }, ...list])
      } catch (e: any) {
        setError(e?.message || 'Failed to load folders')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light">Choose Google Drive Folder</h3>
          <Button variant="ghost" onClick={onClose} className="font-light">Close</Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading folders...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="max-h-80 overflow-auto divide-y">
            {folders.map((f) => (
              <div key={f.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.id}</div>
                </div>
                <Button size="sm" className="font-light" onClick={() => { onPicked({ id: f.id, name: f.name }); onClose() }}>Select</Button>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="text-sm text-muted-foreground">No folders found.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}


