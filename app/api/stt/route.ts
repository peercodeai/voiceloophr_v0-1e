import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const rawKey = formData.get("openaiKey")
    const userOpenaiKey = typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey : undefined

    if (!audioFile) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 })
    }

    // Use user-provided API key if available, otherwise fall back to environment variable
    const finalOpenaiKey = userOpenaiKey || process.env.OPENAI_API_KEY;
    if (!finalOpenaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in settings.' },
        { status: 500 }
      )
    }

    // Validate audio file
    if (audioFile.size === 0) {
      return NextResponse.json({ error: "Audio file is empty" }, { status: 400 })
    }

    // Check file size (Whisper has a 25MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large. Maximum size is 25MB" }, { status: 400 })
    }

    // Create FormData for OpenAI Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalOpenaiKey}`
      },
      body: whisperFormData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(`Speech-to-text failed: ${errorMessage}`)
    }

    const result = await response.json()
    
    if (!result.text) {
      throw new Error('No transcription text received from Whisper API')
    }

    return NextResponse.json({ 
      success: true, 
      transcription: result.text,
      model: 'whisper-1',
      language: result.language || 'unknown'
    })

  } catch (error) {
    console.error("STT error:", error)
    const errorMessage = error instanceof Error ? error.message : "Speech-to-text failed"
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
