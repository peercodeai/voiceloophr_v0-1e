import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, openaiKey, voice = "alloy" } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }

    const finalOpenaiKey = openaiKey || process.env.OPENAI_API_KEY
    if (!finalOpenaiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // OpenAI TTS via audio.speech
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${finalOpenaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: String(text).slice(0, 800),
        voice,
        format: "mp3",
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "")
      return NextResponse.json({ error: `OpenAI TTS failed: ${errText || resp.statusText}` }, { status: 500 })
    }

    const arrayBuffer = await resp.arrayBuffer()
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }

    // Use server environment variable for API key
    const finalOpenaiKey = process.env.OPENAI_API_KEY;
    if (!finalOpenaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured in environment variables.' },
        { status: 500 }
      )
    }

    const input = String(text).slice(0, 1000)
    const chosenVoice = typeof voice === 'string' && voice.trim().length > 0 ? voice : 'alloy'

    const attempt = async (model: string) => {
      const resp = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalOpenaiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(
          model === 'gpt-4o-mini-tts'
            ? { model, voice: chosenVoice, input }
            : { model, input, voice: chosenVoice, speed: 1 }
        )
      })
      return resp
    }

    let resp = await attempt('gpt-4o-mini-tts')
    if (!resp.ok) {
      // Fallback to tts-1 model
      resp = await attempt('tts-1')
    }

    if (!resp.ok) {
      let errorMessage = `HTTP ${resp.status}: ${resp.statusText}`
      try {
        const ct = resp.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const data = await resp.json()
          errorMessage = data?.error?.message || data?.message || JSON.stringify(data)
        } else {
          const textBody = await resp.text()
          if (textBody) errorMessage = textBody
        }
      } catch {}
      return NextResponse.json({ error: `OpenAI TTS failed: ${errorMessage}` }, { status: 500 })
    }

    const contentType = resp.headers.get('content-type') || ''
    if (!contentType.includes('audio/')) {
      return NextResponse.json({ error: 'Invalid response from OpenAI TTS - no audio content received' }, { status: 500 })
    }

    return new NextResponse(resp.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="tts-openai.mp3"',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('OpenAI TTS route error:', error)
    const message = error instanceof Error ? error.message : 'OpenAI TTS error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

