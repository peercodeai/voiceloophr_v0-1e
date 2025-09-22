import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { elevenlabsKey } = await request.json()
    if (!elevenlabsKey) {
      return NextResponse.json({ error: "Missing ElevenLabs key" }, { status: 400 })
    }

    const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': elevenlabsKey }
    })

    if (!resp.ok) {
      let detail = ''
      try { detail = await resp.text() } catch {}
      return NextResponse.json({ error: `Failed to fetch voices: HTTP ${resp.status} ${resp.statusText}${detail ? ` - ${detail}` : ''}` }, { status: 500 })
    }

    const data = await resp.json().catch(() => ({}))
    const voices = Array.isArray(data?.voices)
      ? data.voices.map((v: any) => ({ id: v?.voice_id, name: v?.name }))
      : []

    return NextResponse.json({ success: true, voices })
  } catch (error) {
    console.error('ElevenLabs voices route error:', error)
    return NextResponse.json({ error: 'Failed to list voices' }, { status: 500 })
  }
}


