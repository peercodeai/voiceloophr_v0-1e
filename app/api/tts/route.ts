import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, elevenlabsKey, voiceId: clientVoiceId } = await request.json()

    if (!text || !elevenlabsKey) {
      return NextResponse.json({ error: "Missing text or ElevenLabs key" }, { status: 400 })
    }

    // Validate text length (ElevenLabs has limits)
    if (text.length > 5000) {
      return NextResponse.json({ error: "Text too long. Maximum length is 5000 characters" }, { status: 400 })
    }

    // Resolve voice: allow either voice ID or human-readable name (e.g., "Jessica")
    let voiceId = clientVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
    const isLikelyId = typeof voiceId === 'string' && voiceId.length > 20 && !/\s/.test(voiceId)
    if (!isLikelyId && typeof voiceId === 'string' && voiceId.trim().length > 0) {
      try {
        const voicesResp = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': elevenlabsKey }
        })
        if (voicesResp.ok) {
          const data = await voicesResp.json().catch(() => ({} as any))
          const match = Array.isArray(data?.voices)
            ? data.voices.find((v: any) => String(v?.name || '').toLowerCase().includes(voiceId.toLowerCase()))
            : null
          if (match?.voice_id) voiceId = match.voice_id
        }
      } catch (e) {
        // Non-fatal: fall back to default if lookup fails
        console.warn('ElevenLabs voices lookup failed:', e)
      }

      // If we could not resolve a human-friendly name to an ID, use a known default ID
      if (typeof voiceId === 'string' && (voiceId.trim().length === 0 || /\s/.test(voiceId) || voiceId.length <= 20)) {
        voiceId = '21m00Tcm4TlvDq8ikWAM'
      }
    }

    // Call ElevenLabs TTS API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const ct = response.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const errorData: any = await response.json()
          // Handle ElevenLabs error shape: { detail: { status, message } }
          const nested = typeof errorData?.detail === 'object' ? (errorData.detail.message || errorData.detail.status) : undefined
          const flat = errorData?.message || errorData?.error || errorData?.detail
          errorMessage = String(nested || flat || JSON.stringify(errorData))
        } else {
          const textBody = await response.text()
          if (textBody) errorMessage = textBody
        }
      } catch {}
      throw new Error(`TTS generation failed: ${errorMessage}`)
    }

    // Check if we got audio content
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('audio/')) {
      throw new Error('Invalid response from ElevenLabs API - no audio content received')
    }

    // Stream the audio directly to the client
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="tts-audio.mp3"',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error("TTS error:", error)
    const errorMessage = error instanceof Error ? error.message : "TTS generation failed"
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
