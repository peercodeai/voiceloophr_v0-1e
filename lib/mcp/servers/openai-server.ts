/**
 * OpenAI MCP Server
 * Encapsulates OpenAI functionality as MCP tools and resources
 */

import { MCPServer } from '../server'
import { OpenAIService, DocumentAnalysis, OpenAIConfig } from '../../services/openai'
import { AIService } from '../../aiService'

export interface OpenAIMCPServerConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export class OpenAIMCPServer extends MCPServer {
  private openaiService: OpenAIService
  private aiService: typeof AIService

  constructor(config: OpenAIMCPServerConfig) {
    super({
      name: 'openai-mcp-server',
      version: '1.0.0',
      description: 'OpenAI integration server for VoiceLoop HR'
    })

    // Initialize OpenAI service
    this.openaiService = new OpenAIService({
      apiKey: config.apiKey,
      model: config.model || 'gpt-4',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3
    })

    this.aiService = AIService

    // Register tools
    this.registerTools()
    // Register resources
    this.registerResources()
  }

  /**
   * Register all OpenAI tools
   */
  private registerTools(): void {
    // Document Analysis Tool
    this.registerTool(
      'openai/analyzeDocument',
      'Analyze document content using OpenAI GPT-4',
      {
        properties: {
          text: { type: 'string', description: 'Document text content' },
          fileName: { type: 'string', description: 'Name of the document file' },
          fileType: { type: 'string', description: 'Type of the document file' }
        },
        required: ['text', 'fileName', 'fileType']
      },
      async (params) => {
        return await this.openaiService.analyzeDocument(
          params.text,
          params.fileName,
          params.fileType
        )
      }
    )

    // Chat Completion Tool
    this.registerTool(
      'openai/chatCompletion',
      'Generate chat completion using OpenAI GPT-4',
      {
        properties: {
          messages: { 
            type: 'array', 
            description: 'Array of chat messages',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                content: { type: 'string' }
              },
              required: ['role', 'content']
            }
          },
          maxTokens: { type: 'number', description: 'Maximum tokens to generate' },
          temperature: { type: 'number', description: 'Sampling temperature' }
        },
        required: ['messages']
      },
      async (params) => {
        return await this.aiService.analyzeDocument(
          params.messages[params.messages.length - 1]?.content || '',
          process.env.OPENAI_API_KEY || '',
          'analyze'
        )
      }
    )

    // Answer Question Tool
    this.registerTool(
      'openai/answerQuestion',
      'Answer questions about document content',
      {
        properties: {
          text: { type: 'string', description: 'Document text content' },
          question: { type: 'string', description: 'Question to answer' },
          openaiKey: { type: 'string', description: 'OpenAI API key' }
        },
        required: ['text', 'question', 'openaiKey']
      },
      async (params) => {
        return await this.aiService.answerQuestion(
          params.text,
          params.question,
          params.openaiKey
        )
      }
    )

    // Speech-to-Text Tool
    this.registerTool(
      'openai/speechToText',
      'Convert speech to text using OpenAI Whisper',
      {
        properties: {
          audioData: { type: 'string', description: 'Base64 encoded audio data' },
          openaiKey: { type: 'string', description: 'OpenAI API key' }
        },
        required: ['audioData', 'openaiKey']
      },
      async (params) => {
        // This would need to be implemented in AIService
        // For now, return a placeholder
        return {
          text: 'Speech-to-text functionality needs to be implemented in AIService',
          confidence: 0.8
        }
      }
    )

    // Text Summarization Tool
    this.registerTool(
      'openai/summarize',
      'Summarize text content using OpenAI GPT-4',
      {
        properties: {
          text: { type: 'string', description: 'Text content to summarize' },
          openaiKey: { type: 'string', description: 'OpenAI API key' }
        },
        required: ['text', 'openaiKey']
      },
      async (params) => {
        return await this.aiService.analyzeDocument(
          params.text,
          process.env.OPENAI_API_KEY || '',
          'summarize'
        )
      }
    )

    // Key Points Extraction Tool
    this.registerTool(
      'openai/extractKeyPoints',
      'Extract key points from text using OpenAI GPT-4',
      {
        properties: {
          text: { type: 'string', description: 'Text content to analyze' },
          openaiKey: { type: 'string', description: 'OpenAI API key' }
        },
        required: ['text', 'openaiKey']
      },
      async (params) => {
        return await this.aiService.analyzeDocument(
          params.text,
          process.env.OPENAI_API_KEY || '',
          'extract_key_points'
        )
      }
    )
  }

  /**
   * Register all OpenAI resources
   */
  private registerResources(): void {
    // Document Analysis Results Resource
    this.registerResource(
      'openai://analysis/results',
      'Document Analysis Results',
      'Latest document analysis results from OpenAI',
      'application/json',
      async () => {
        return {
          message: 'Document analysis results resource',
          timestamp: new Date().toISOString(),
          status: 'available'
        }
      }
    )

    // Chat History Resource
    this.registerResource(
      'openai://chat/history',
      'Chat History',
      'Chat conversation history with OpenAI',
      'application/json',
      async () => {
        return {
          message: 'Chat history resource',
          timestamp: new Date().toISOString(),
          status: 'available'
        }
      }
    )

    // Model Information Resource
    this.registerResource(
      'openai://model/info',
      'OpenAI Model Information',
      'Information about available OpenAI models',
      'application/json',
      async () => {
        return {
          models: ['gpt-4', 'gpt-3.5-turbo', 'whisper-1'],
          currentModel: 'gpt-4',
          capabilities: ['text-generation', 'chat-completion', 'speech-to-text'],
          timestamp: new Date().toISOString()
        }
      }
    )
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      ...this.getServerInfo(),
      status: 'running',
      openaiConfigured: !!this.openaiService,
      toolsCount: this.getServerInfo().tools.length,
      resourcesCount: this.getServerInfo().resources.length
    }
  }
}
