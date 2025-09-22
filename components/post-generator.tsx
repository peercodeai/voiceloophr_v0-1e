"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  text: string
  title: string
}

const tones = ['professional', 'concise', 'promotional'] as const

export default function PostGenerator({ text, title }: Props) {
  const [tone, setTone] = useState<typeof tones[number]>('professional')
  const [copied, setCopied] = useState(false)

  const hashtags = useMemo(() => {
    const base = ['#AI', '#Productivity', '#Docs']
    if (title) base.unshift('#' + title.split(/\s+/)[0].replace(/[^a-z0-9]/gi, ''))
    return base.slice(0, 5)
  }, [title])

  const post = useMemo(() => {
    const max = 1000
    const intro =
      tone === 'promotional'
        ? `Excited to share insights from "${title}" — here are the highlights:\n\n`
        : tone === 'concise'
        ? `Key takeaways from "${title}":\n\n`
        : `Insights from "${title}":\n\n`
    const body = (text || '').replace(/\n+/g, ' ').slice(0, max - intro.length - 40)
    return `${intro}${body}\n\n${hashtags.join(' ')}`
  }, [tone, text, title, hashtags])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const openComposer = () => {
    window.open('https://www.linkedin.com/feed/', '_blank')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Tone:</span>
        {tones.map(t => (
          <Button key={t} size="sm" variant={t === tone ? 'default' : 'outline'} className="font-light" onClick={() => setTone(t)}>
            {t}
          </Button>
        ))}
      </div>
      <textarea className="w-full h-40 text-sm p-3 border rounded-md bg-background" readOnly value={post} />
      <div className="flex items-center gap-2">
        <Button size="sm" className="font-light" onClick={copy}>{copied ? 'Copied' : 'Copy Post'}</Button>
        <Button size="sm" variant="outline" className="font-light bg-transparent" onClick={openComposer}>Open LinkedIn</Button>
      </div>
    </div>
  )
}


