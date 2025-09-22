/**
 * OpenAI Service with MCP Integration
 * Refactored to use MCP Client instead of direct API calls
 */

import { mcpClient } from '@/lib/mcp/client'
import { DocumentAnalysis } from './openai'

export interface OpenAIMCPConfig {
  serverUrl?: string
  timeout?: number
  retries?: number
}

export class OpenAIServiceMCP {
  private config: OpenAIMCPConfig

  constructor(config: OpenAIMCPConfig = {}) {
    this.config = {
      serverUrl: process.env.OPENAI_MCP_SERVER_URL || 'http://localhost:3000/api/mcp/openai',
      timeout: 30000,
      retries: 3,
      ...config
    }

    // Register OpenAI MCP Server
    mcpClient.registerServer('openai', {
      name: 'openai-mcp-server',
      url: this.config.serverUrl!,
      timeout: this.config.timeout,
      retries: this.config.retries
    })
  }

  /**
   * Analyze document using MCP
   */
  async analyzeDocument(
    text: string,
    fileName: string,
    fileType: string
  ): Promise<DocumentAnalysis> {
    try {
      const result = await mcpClient.callTool('openai', 'openai/analyzeDocument', {
        text,
        fileName,
        fileType
      })

      return result as DocumentAnalysis
    } catch (error) {
      console.error('MCP OpenAI analysis failed:', error)
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate chat completion using MCP
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    maxTokens?: number,
    temperature?: number
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('openai', 'openai/chatCompletion', {
        messages,
        maxTokens,
        temperature
      })

      return result
    } catch (error) {
      console.error('MCP OpenAI chat failed:', error)
      throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Answer questions about document content using MCP
   */
  async answerQuestion(
    text: string,
    question: string,
    openaiKey: string
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('openai', 'openai/answerQuestion', {
        text,
        question,
        openaiKey
      })

      return result
    } catch (error) {
      console.error('MCP OpenAI Q&A failed:', error)
      throw new Error(`Question answering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Summarize text using MCP
   */
  async summarize(
    text: string,
    openaiKey: string
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('openai', 'openai/summarize', {
        text,
        openaiKey
      })

      return result
    } catch (error) {
      console.error('MCP OpenAI summarization failed:', error)
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract key points using MCP
   */
  async extractKeyPoints(
    text: string,
    openaiKey: string
  ): Promise<any> {
    try {
      const result = await mcpClient.callTool('openai', 'openai/extractKeyPoints', {
        text,
        openaiKey
      })

      return result
    } catch (error) {
      console.error('MCP OpenAI key points extraction failed:', error)
      throw new Error(`Key points extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get available tools from OpenAI MCP Server
   */
  async getAvailableTools(): Promise<any[]> {
    try {
      return await mcpClient.listTools('openai')
    } catch (error) {
      console.error('Failed to get OpenAI tools:', error)
      return []
    }
  }

  /**
   * Get available resources from OpenAI MCP Server
   */
  async getAvailableResources(): Promise<any[]> {
    try {
      return await mcpClient.listResources('openai')
    } catch (error) {
      console.error('Failed to get OpenAI resources:', error)
      return []
    }
  }

  /**
   * Test MCP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await mcpClient.sendRequest('openai', 'ping')
      return true
    } catch (error) {
      console.error('MCP connection test failed:', error)
      return false
    }
  }
}
