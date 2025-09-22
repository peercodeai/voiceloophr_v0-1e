export interface OpenAIConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface DocumentAnalysis {
  summary: string
  keyPoints: string[]
  mainTopics: string[]
  documentType: string
  confidence: number
  wordCount: number
  sentiment: 'positive' | 'negative' | 'neutral'
  recommendations: string[]
  riskFactors: string[]
  actionItems: string[]
  // Textract-specific data
  textractData?: {
    extractedText: string
    forms: any[]
    tables: any[]
    keyValuePairs: any[]
    confidence: number
  }
}

export class OpenAIService {
  private config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.3,
      ...config
    }
  }

  async analyzeDocument(
    text: string, 
    fileName: string, 
    fileType: string
  ): Promise<DocumentAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(text, fileName, fileType)
      
      const response = await this.callOpenAI(prompt)
      
      return this.parseAnalysisResponse(response, text)
    } catch (error) {
      console.error('OpenAI analysis failed:', error)
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildAnalysisPrompt(text: string, fileName: string, fileType: string): string {
    return `Analyze the following document and provide a comprehensive business analysis in JSON format.

Document: ${fileName}
Type: ${fileType}
Content: ${text.substring(0, 8000)}${text.length > 8000 ? '...' : ''}

IMPORTANT: This text was extracted using AWS Textract (enterprise OCR). Focus on:
1. Business context and implications
2. Sentiment analysis (positive/negative/neutral)
3. Risk identification and assessment
4. Actionable business recommendations
5. Strategic insights

Please provide analysis in this exact JSON format:
{
  "summary": "A concise 2-3 sentence summary of the document's main purpose and business significance",
  "keyPoints": ["Key business point 1", "Key business point 2", "Key business point 3", "Key business point 4", "Key business point 5"],
  "mainTopics": ["Business Topic 1", "Business Topic 2", "Business Topic 3"],
  "documentType": "Specific business document type (e.g., Financial Report, Business Plan, Legal Contract, HR Policy)",
  "confidence": 95,
  "wordCount": ${text.split(/\s+/).filter(word => word.length > 0).length},
  "sentiment": "positive|negative|neutral",
  "recommendations": ["Business recommendation 1", "Business recommendation 2", "Business recommendation 3"],
  "riskFactors": ["Business risk 1", "Business risk 2", "Business risk 3"],
  "actionItems": ["Business action 1", "Business action 2", "Business action 3"]
}

Focus on business value, actionable insights, risk assessment, and professional analysis. Be specific and relevant to the document content.`
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional business analyst specializing in document analysis. Provide clear, actionable insights in the exact JSON format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  private parseAnalysisResponse(response: string, originalText: string): DocumentAnalysis {
    try {
      // Extract JSON from response (handle cases where OpenAI adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('No JSON found in OpenAI response, using fallback analysis')
        return this.createFallbackAnalysis(originalText)
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and provide fallbacks
      return {
        summary: parsed.summary || 'Document analysis completed successfully.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['Key information extracted and analyzed'],
        mainTopics: Array.isArray(parsed.mainTopics) ? parsed.mainTopics : ['Business Document'],
        documentType: parsed.documentType || 'Business Document',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 95,
        wordCount: typeof parsed.wordCount === 'number' ? parsed.wordCount : originalText.split(/\s+/).filter(word => word.length > 0).length,
        sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Review document content for key insights'],
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : ['Standard business document risks apply'],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : ['Review analysis and take appropriate action'],
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      // Fallback to basic analysis
      return this.generateFallbackAnalysis(originalText)
    }
  }

  private generateFallbackAnalysis(text: string): DocumentAnalysis {
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
    
    return {
      summary: 'Document analysis completed with basic text processing due to AI service unavailability.',
      keyPoints: [
        'Document content successfully extracted',
        'Text processing completed',
        'Basic analysis performed',
        'Ready for manual review',
        'Consider enabling AI analysis for deeper insights'
      ],
      mainTopics: ['Document Processing', 'Content Extraction', 'Text Analysis'],
      documentType: 'Business Document',
      confidence: 85,
      wordCount: words.length,
      sentiment: 'neutral',
      recommendations: [
        'Review extracted content manually',
        'Enable AI analysis for better insights',
        'Consider document-specific analysis tools'
      ],
      riskFactors: ['Limited automated analysis', 'Manual review required'],
      actionItems: ['Review document content', 'Enable AI analysis', 'Process additional documents']
    }
  }

  private createFallbackAnalysis(originalText: string): DocumentAnalysis {
    const wordCount = originalText.split(/\s+/).length
    const charCount = originalText.length
    
    return {
      summary: `Document processed successfully. Contains ${wordCount} words and ${charCount} characters.`,
      keyPoints: [
        'Document successfully processed',
        `Content length: ${wordCount} words`,
        'Ready for analysis and search'
      ],
      sentiment: 'neutral',
      confidence: 0.7,
      metadata: {
        fallback: true,
        wordCount,
        charCount,
        processedAt: new Date().toISOString()
      }
    }
  }
}
