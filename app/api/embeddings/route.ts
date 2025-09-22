import { type NextRequest, NextResponse } from "next/server"

// Mock storage for development (replace with Supabase in production)
declare global {
  var documentEmbeddings: Map<string, any[]> | undefined
}

export async function POST(request: NextRequest) {
  try {
    const { fileId, openaiKey } = await request.json()

    if (!fileId || !openaiKey) {
      return NextResponse.json({ error: "Missing fileId or OpenAI key" }, { status: 400 })
    }

    // Get file data
    global.uploadedFiles = global.uploadedFiles || new Map()
    const fileData = global.uploadedFiles.get(fileId)

    if (!fileData || !fileData.extractedText) {
      return NextResponse.json({ error: "File not found or not processed" }, { status: 404 })
    }

    // In a real implementation, this would:
    // 1. Split document into chunks
    // 2. Generate embeddings for each chunk using OpenAI
    // 3. Store embeddings in Supabase vector database

    // Simulate embedding generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock chunk processing
    const textChunks = chunkText(fileData.extractedText, 500)
    const mockEmbeddings = textChunks.map((chunk, index) => ({
      id: `${fileId}_chunk_${index}`,
      fileId,
      fileName: fileData.name,
      chunkText: chunk,
      chunkIndex: index,
      embedding: Array(1536)
        .fill(0)
        .map(() => Math.random() - 0.5), // Mock 1536-dim embedding
      createdAt: new Date().toISOString(),
    }))

    // In a real app, these would be stored in Supabase
    global.documentEmbeddings = global.documentEmbeddings || new Map()
    global.documentEmbeddings.set(fileId, mockEmbeddings)

    return NextResponse.json({
      success: true,
      fileId,
      chunksProcessed: textChunks.length,
      embeddingsGenerated: mockEmbeddings.length,
    })

    /* Real implementation would be:
    // Split text into chunks
    const chunks = chunkText(fileData.extractedText, 500)
    
    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(async (chunk, index) => {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: chunk
        })
      })
      
      const result = await response.json()
      return {
        fileId,
        fileName: fileData.name,
        chunkText: chunk,
        chunkIndex: index,
        embedding: result.data[0].embedding
      }
    })

    const embeddings = await Promise.all(embeddingPromises)

    // Store in Supabase
    const { error } = await supabase
      .from('document_embeddings')
      .insert(embeddings)

    if (error) throw error

    return NextResponse.json({
      success: true,
      fileId,
      chunksProcessed: chunks.length
    })
    */
  } catch (error) {
    console.error("Embeddings error:", error)
    return NextResponse.json({ error: "Embeddings generation failed" }, { status: 500 })
  }
}

function chunkText(text: string, maxChunkSize: number): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
