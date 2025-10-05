import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/aiService"
import { chatSchema, validateRequest, createErrorResponse, APIError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, fileId, contextText, openaiKey } = validateRequest(chatSchema, body)

    // Use user-provided API key if available, otherwise fall back to environment variable
    const finalOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;
    if (!finalOpenaiKey) {
      return NextResponse.json(
        createErrorResponse(500, 'OpenAI API key not configured. Please add your API key in settings.', 'API_KEY_MISSING', {
          suggestion: 'Go to Settings and configure your OpenAI API key to enable chat functionality.'
        }),
        { status: 500 }
      )
    }

    // Get file context if provided, or fall back to explicit contextText
    let context = ""
    if (typeof contextText === 'string' && contextText.trim().length > 0) {
      context = contextText
    } else if (fileId) {
      global.uploadedFiles = global.uploadedFiles || new Map()
      const fileData = global.uploadedFiles.get(fileId)
      if (fileData && fileData.extractedText) {
        context = fileData.extractedText
      }
    }

    // Clamp inputs to safe lengths
    const MAX_MESSAGE_CHARS = 1000
    const MAX_CONTEXT_CHARS = 12000
    const safeMessage = message.slice(0, MAX_MESSAGE_CHARS)
    const safeContext = context ? String(context).slice(0, MAX_CONTEXT_CHARS) : ""

    // Use a timeout to avoid hanging requests
    const withTimeout = <T>(promise: Promise<T>, ms: number) => {
      return Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)) as Promise<T>,
      ])
    }

    const answerPromise = AIService.answerQuestion(
      safeContext || "",
      safeMessage,
      finalOpenaiKey
    )

    const result = await withTimeout(answerPromise, 30000)

    return NextResponse.json({
      success: true,
      response: result.content,
      hasContext: !!safeContext,
      metadata: result.metadata || {}
    })
  } catch (error) {
    console.error("Chat error:", error)
    
    if (error instanceof APIError) {
      return NextResponse.json(
        createErrorResponse(error.statusCode, error.message, error.code, error.details),
        { status: error.statusCode }
      )
    }
    
    const message = error instanceof Error ? error.message : "Unknown error"
    const isTimeout = message.toLowerCase().includes("timeout")
    
    return NextResponse.json(
      createErrorResponse(
        isTimeout ? 504 : 500, 
        "Chat failed", 
        isTimeout ? "TIMEOUT_ERROR" : "CHAT_ERROR",
        {
          details: message,
          suggestion: isTimeout 
            ? "The request took too long. Please try again or simplify your question."
            : "Please check your API key and try again."
        }
      ),
      { status: isTimeout ? 504 : 500 }
    )
  }
}
