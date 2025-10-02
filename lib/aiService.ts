export interface AIAnalysisRequest {
  text: string
  task: 'summarize' | 'analyze' | 'extract_key_points' | 'answer_question'
  question?: string
  context?: string
}

export interface AIAnalysisResponse {
  content: string
  confidence?: number
  metadata?: Record<string, any>
}

export class AIService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
  private static readonly WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions'

  /**
   * Analyze document content using OpenAI GPT-4
   */
  static async analyzeDocument(
    text: string, 
    openaiKey: string, 
    task: 'summarize' | 'analyze' | 'extract_key_points' = 'summarize'
  ): Promise<AIAnalysisResponse> {
    try {
      const systemPrompt = this.getSystemPrompt(task)
      const userPrompt = this.getUserPrompt(text, task)

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.3,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenAI API Error (analyzeDocument):', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in settings.')
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.')
        } else if (response.status === 500) {
          throw new Error('OpenAI API server error. Please try again later.')
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content received from OpenAI API')
      }

      return {
        content,
        confidence: data.choices[0]?.finish_reason === 'stop' ? 0.95 : 0.8,
        metadata: {
          model: data.model,
          usage: data.usage,
          finish_reason: data.choices[0]?.finish_reason
        }
      }
    } catch (error) {
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Answer questions about document content
   */
  static async answerQuestion(
    text: string,
    question: string,
    openaiKey: string
  ): Promise<AIAnalysisResponse> {
    try {
      const systemPrompt = `You are an intelligent document analysis assistant. Your role is to answer questions about documents based on the content provided. Always base your answers on the document content and be specific. If the answer cannot be found in the document, say so clearly.`

      const userPrompt = `Document Content:
${text}

Question: ${question}

Please provide a clear, accurate answer based on the document content above.`

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800,
          temperature: 0.2,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenAI API Error (answerQuestion):', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          question: question.substring(0, 100) + '...'
        })
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in settings.')
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.')
        } else if (response.status === 500) {
          throw new Error('OpenAI API server error. Please try again later.')
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content received from OpenAI API')
      }

      return {
        content,
        confidence: data.choices[0]?.finish_reason === 'stop' ? 0.95 : 0.8,
        metadata: {
          model: data.model,
          usage: data.usage,
          question,
          finish_reason: data.choices[0]?.finish_reason
        }
      }
    } catch (error) {
      throw new Error(`Question answering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    openaiKey: string,
    filename: string = 'audio.wav'
  ): Promise<AIAnalysisResponse> {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([audioBuffer]), filename)
      formData.append('model', 'whisper-1')
      formData.append('response_format', 'text')

      const response = await fetch(this.WHISPER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Whisper API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const transcription = await response.text()

      return {
        content: transcription,
        confidence: 0.9,
        metadata: {
          model: 'whisper-1',
          filename,
          audio_size: audioBuffer.length
        }
      }
    } catch (error) {
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate embeddings for text chunks with quota management and retry logic
   */
  static async generateEmbeddings(
    text: string,
    openaiKey: string,
    retryCount: number = 0
  ): Promise<number[]> {
    const maxRetries = 3
    const baseDelay = 1000 // 1 second base delay
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle quota exceeded with exponential backoff
        if (response.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000
          console.log(`⚠️ OpenAI quota exceeded, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${maxRetries + 1})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.generateEmbeddings(text, openaiKey, retryCount + 1)
        }
        
        throw new Error(`Embeddings API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data.data[0]?.embedding || []
    } catch (error) {
      // If it's a quota error and we haven't exceeded max retries, try again
      if (error instanceof Error && error.message.includes('429') && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000
        console.log(`⚠️ Embedding generation failed, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.generateEmbeddings(text, openaiKey, retryCount + 1)
      }
      
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static getSystemPrompt(task: string): string {
    switch (task) {
      case 'summarize':
        return `You are an expert document summarizer. Create a comprehensive, well-structured summary that captures the key points, main ideas, and important details from the document. Use clear headings, bullet points, and organize information logically. Focus on actionable insights and business value.`
      
      case 'analyze':
        return `You are an expert document analyst. Provide a detailed analysis of the document including key themes, insights, implications, and recommendations. Identify patterns, trends, and areas of importance. Structure your response with clear sections and actionable insights.`
      
      case 'extract_key_points':
        return `You are an expert at extracting key points from documents. Identify and list the most important points, facts, figures, and insights. Present them in a clear, organized manner with bullet points. Focus on what matters most for business decision-making.`
      
      default:
        return `You are an intelligent document analysis assistant. Help analyze and understand document content.`
    }
  }

  private static getUserPrompt(text: string, task: string): string {
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text
    
    switch (task) {
      case 'summarize':
        return `Please provide a comprehensive summary of the following document:

${truncatedText}

Create a well-structured summary with:
- Key Points
- Action Items  
- Insights
- Recommendations

Make it business-focused and actionable.`
      
      case 'analyze':
        return `Please provide a detailed analysis of the following document:

${truncatedText}

Include:
- Key themes and patterns
- Business implications
- Risk assessment
- Strategic recommendations
- Action items

Provide actionable insights for business decision-making.`
      
      case 'extract_key_points':
        return `Please extract the key points from the following document:

${truncatedText}

Focus on:
- Main facts and figures
- Critical information
- Key insights
- Important dates/numbers
- Actionable items

Present in a clear, organized format.`
      
      default:
        return `Please analyze this document: ${truncatedText}`
    }
  }
}
