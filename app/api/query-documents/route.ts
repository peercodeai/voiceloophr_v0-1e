import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { query, allDocuments } = await request.json()

    // Get all document data from your global storage
    const documents = await getAllDocumentData()
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 })
    }

    // Create query prompt
    const prompt = createQueryPrompt(documents, query)

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert document analyst and communication assistant. Answer questions about documents across multiple sources, providing clear, helpful insights that help users understand and communicate with their document content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content || 'No analysis available'

    // Extract relevant documents and insights
    const insights = extractInsights(analysis, documents)

    return NextResponse.json({
      query,
      analysis,
      insights,
      totalDocuments: documents.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Document query error:', error)
    return NextResponse.json(
      { error: 'Failed to query documents' },
      { status: 500 }
    )
  }
}

async function getAllDocumentData() {
  // This would integrate with your existing global storage system
  // For now, returning mock data that represents your processed files
  return [
    {
      id: 'file_1',
      fileName: '9.14.25_IP_Analysis.pdf',
      text: 'Intellectual Property Analysis document covering patent landscape, competitive positioning, and technology trends in the AI/ML space. Includes market analysis and strategic recommendations for IP portfolio development.',
      tags: ['IP', 'Analysis', 'Patents', 'Technology', 'AI/ML'],
      wordCount: 1628
    },
    {
      id: 'file_2', 
      fileName: 'TooltipCompanion_Browser_Valuation_and_Monetization.pdf',
      text: 'Browser extension monetization strategy and valuation analysis. Covers user acquisition, revenue models, and market opportunity assessment for browser-based productivity tools.',
      tags: ['Valuation', 'Monetization', 'Browser Extension', 'Strategy'],
      wordCount: 2341
    },
    {
      id: 'file_3',
      fileName: 'Shine_IP.pdf',
      text: 'Comprehensive intellectual property strategy for a fintech startup. Includes patent filing strategy, competitive analysis, and technology roadmap for financial services innovation.',
      tags: ['Fintech', 'IP Strategy', 'Patents', 'Startup'],
      wordCount: 1892
    },
    {
      id: 'file_4',
      fileName: 'Market_Research_Report.pdf',
      text: 'Market research analysis covering industry trends, consumer behavior, and competitive landscape. Includes data on market size, growth projections, and strategic recommendations.',
      tags: ['Market Research', 'Industry Analysis', 'Consumer Behavior', 'Strategy'],
      wordCount: 142
    }
  ]
}

function createQueryPrompt(documents: any[], query: string) {
  const documentTexts = documents.map((doc, index) => 
    `Document ${index + 1}: ${doc.fileName}\nTags: ${doc.tags?.join(', ') || 'N/A'}\nContent: ${doc.text}\n`
  ).join('\n')

  return `
You have access to the following documents:

${documentTexts}

Query: ${query}

Please provide:
1. **Direct answers** to the query based on the available documents
2. **Relevant documents** that contain the information
3. **Key insights** and patterns found in the documents
4. **Important connections** between different documents
5. **Summary** of the most relevant information

Focus on providing clear, helpful responses that help users:
- Understand their document content
- Find specific information quickly
- Answer their questions directly
- Learn from the document insights
- Communicate key points effectively

Format your response clearly and cite specific documents when relevant. Be conversational and helpful.
`
}

function extractInsights(analysis: string, documents: any[]) {
  // Simple insight extraction - in production, you'd want more sophisticated parsing
  const insights = {
    relevantDocuments: [],
    keyFindings: [],
    recommendations: []
  }

  // Extract document references
  documents.forEach(doc => {
    if (analysis.toLowerCase().includes(doc.fileName.toLowerCase())) {
      insights.relevantDocuments.push({
        fileName: doc.fileName,
        tags: doc.tags,
        wordCount: doc.wordCount
      })
    }
  })

  // Extract key findings and recommendations
  const lines = analysis.split('\n')
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || line.includes('Key finding')) {
      const cleaned = line.replace(/^[\s•\-\*]+/, '').trim()
      if (cleaned.length > 10) {
        if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest')) {
          insights.recommendations.push(cleaned)
        } else {
          insights.keyFindings.push(cleaned)
        }
      }
    }
  }

  return insights
}
