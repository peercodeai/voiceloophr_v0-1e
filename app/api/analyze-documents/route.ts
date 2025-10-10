import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client only when needed to avoid build-time errors
function getOpenAIClient(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OpenAI API key not provided')
  }
  return new OpenAI({ apiKey: key })
}

export async function POST(request: NextRequest) {
  try {
    const { documentIds, query, openaiKey } = await request.json()

    // Get document data from your global storage
    // This would integrate with your existing file storage system
    const documents = await getDocumentData(documentIds)
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 })
    }

    // Create comparison prompt
    const prompt = createComparisonPrompt(documents, query)

    // Initialize OpenAI client with user's API key or fallback to environment
    const openai = getOpenAIClient(openaiKey)

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert document analyst and communication specialist. Analyze documents and provide clear, helpful insights that help users understand and communicate with their document content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content || 'No analysis available'

    // Extract structured recommendations
    const recommendations = extractRecommendations(analysis)

    return NextResponse.json({
      analysis,
      recommendations,
      comparedDocuments: documentIds,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze documents' },
      { status: 500 }
    )
  }
}

async function getDocumentData(documentIds: string[]) {
  // This would integrate with your existing global storage system
  // For now, returning mock data that matches your processed files
  return [
    {
      id: 'file_1',
      fileName: '9.14.25_IP_Analysis.pdf',
      text: 'Intellectual Property Analysis document covering patent landscape, competitive positioning, and technology trends in the AI/ML space. Includes market analysis and strategic recommendations for IP portfolio development.',
      tags: ['IP', 'Analysis', 'Patents', 'Technology', 'AI/ML']
    },
    {
      id: 'file_2', 
      fileName: 'TooltipCompanion_Browser_Valuation_and_Monetization.pdf',
      text: 'Browser extension monetization strategy and valuation analysis. Covers user acquisition, revenue models, and market opportunity assessment for browser-based productivity tools.',
      tags: ['Valuation', 'Monetization', 'Browser Extension', 'Strategy']
    },
    {
      id: 'file_3',
      fileName: 'Shine_IP.pdf',
      text: 'Comprehensive intellectual property strategy for a fintech startup. Includes patent filing strategy, competitive analysis, and technology roadmap for financial services innovation.',
      tags: ['Fintech', 'IP Strategy', 'Patents', 'Startup']
    }
  ]
}

function createComparisonPrompt(documents: any[], query: string) {
  const documentTexts = documents.map((doc, index) => 
    `Document ${index + 1}: ${doc.fileName}\n${doc.text}\n`
  ).join('\n')

  return `
Compare and analyze the following documents:

${documentTexts}

Query: ${query}

Please provide:
1. **Key insights** from each document
2. **Common themes** and patterns across documents
3. **Important connections** between documents
4. **Main takeaways** and conclusions
5. **Questions answered** by the documents
6. **Summary** of the most important information

Focus on making the content accessible and useful for:
- Understanding document content
- Finding relevant information quickly
- Communicating key points clearly
- Answering specific questions
- Summarizing complex topics

Format your response in a clear, conversational way that helps users understand and work with their documents.
`
}

function extractRecommendations(analysis: string) {
  // Simple extraction - in production, you'd want more sophisticated parsing
  const lines = analysis.split('\n')
  const recommendations = []

  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || line.includes('Recommendation')) {
      const cleaned = line.replace(/^[\s•\-\*]+/, '').trim()
      if (cleaned.length > 10) {
        recommendations.push(cleaned)
      }
    }
  }

  return recommendations.slice(0, 5) // Limit to 5 recommendations
}
