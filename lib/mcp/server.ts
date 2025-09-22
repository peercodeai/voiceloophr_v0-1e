/**
 * MCP Server Framework for VoiceLoop HR
 * Base classes and utilities for building MCP Servers
 */

import { MCPRequest, MCPResponse, MCPTool, MCPResource } from './client'

export interface MCPToolHandler {
  (params: any): Promise<any>
}

export interface MCPResourceHandler {
  (uri: string): Promise<any>
}

export interface MCPServerOptions {
  name: string
  version?: string
  description?: string
  port?: number
  host?: string
}

export class MCPServer {
  private tools: Map<string, MCPToolHandler> = new Map()
  private resources: Map<string, MCPResourceHandler> = new Map()
  private toolSchemas: Map<string, MCPTool> = new Map()
  private resourceSchemas: Map<string, MCPResource> = new Map()
  private options: MCPServerOptions

  constructor(options: MCPServerOptions) {
    this.options = {
      version: '1.0.0',
      description: 'MCP Server',
      port: 3001,
      host: 'localhost',
      ...options
    }
  }

  /**
   * Register a tool with the server
   */
  registerTool(
    name: string, 
    description: string, 
    inputSchema: any, 
    handler: MCPToolHandler
  ): void {
    const tool: MCPTool = {
      name,
      description,
      inputSchema: {
        type: 'object',
        ...inputSchema
      }
    }

    this.tools.set(name, handler)
    this.toolSchemas.set(name, tool)
  }

  /**
   * Register a resource with the server
   */
  registerResource(
    uri: string,
    name: string,
    description?: string,
    mimeType?: string,
    handler?: MCPResourceHandler
  ): void {
    const resource: MCPResource = {
      uri,
      name,
      description,
      mimeType
    }

    this.resources.set(uri, handler || (() => Promise.resolve({})))
    this.resourceSchemas.set(uri, resource)
  }

  /**
   * Handle incoming MCP requests
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const { method, params, id } = request

      switch (method) {
        case 'initialize':
          return this.handleInitialize(id)
        
        case 'tools/list':
          return this.handleListTools(id)
        
        case 'tools/call':
          return this.handleCallTool(id, params)
        
        case 'resources/list':
          return this.handleListResources(id)
        
        case 'resources/read':
          return this.handleReadResource(id, params)
        
        case 'ping':
          return this.handlePing(id)
        
        default:
          return this.createErrorResponse(id, -32601, `Method not found: ${method}`)
      }
    } catch (error) {
      console.error('MCP Server error:', error)
      return this.createErrorResponse(
        request.id, 
        -32603, 
        'Internal error', 
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(id: string | number): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: this.options.name,
          version: this.options.version,
          description: this.options.description
        }
      }
    }
  }

  /**
   * Handle tools/list request
   */
  private handleListTools(id: string | number): MCPResponse {
    const tools = Array.from(this.toolSchemas.values())
    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    }
  }

  /**
   * Handle tools/call request
   */
  private async handleCallTool(id: string | number, params: any): Promise<MCPResponse> {
    const { name, arguments: args } = params || {}
    
    if (!name) {
      return this.createErrorResponse(id, -32602, 'Missing tool name')
    }

    const handler = this.tools.get(name)
    if (!handler) {
      return this.createErrorResponse(id, -32601, `Tool not found: ${name}`)
    }

    try {
      const result = await handler(args || {})
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
      }
    } catch (error) {
      return this.createErrorResponse(
        id, 
        -32603, 
        'Tool execution failed', 
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Handle resources/list request
   */
  private handleListResources(id: string | number): MCPResponse {
    const resources = Array.from(this.resourceSchemas.values())
    return {
      jsonrpc: '2.0',
      id,
      result: { resources }
    }
  }

  /**
   * Handle resources/read request
   */
  private async handleReadResource(id: string | number, params: any): Promise<MCPResponse> {
    const { uri } = params || {}
    
    if (!uri) {
      return this.createErrorResponse(id, -32602, 'Missing resource URI')
    }

    const handler = this.resources.get(uri)
    if (!handler) {
      return this.createErrorResponse(id, -32601, `Resource not found: ${uri}`)
    }

    try {
      const result = await handler(uri)
      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [{
            uri,
            mimeType: this.resourceSchemas.get(uri)?.mimeType || 'text/plain',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }]
        }
      }
    } catch (error) {
      return this.createErrorResponse(
        id, 
        -32603, 
        'Resource read failed', 
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Handle ping request
   */
  private handlePing(id: string | number): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: { message: 'pong' }
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    id: string | number, 
    code: number, 
    message: string, 
    data?: any
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        ...(data && { data })
      }
    }
  }

  /**
   * Get server info
   */
  getServerInfo() {
    return {
      name: this.options.name,
      version: this.options.version,
      description: this.options.description,
      tools: Array.from(this.toolSchemas.keys()),
      resources: Array.from(this.resourceSchemas.keys())
    }
  }
}

/**
 * Create a Next.js API handler for MCP Server
 */
export function createMCPHandler(server: MCPServer) {
  return async (request: any, response: any) => {
    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const mcpRequest: MCPRequest = request.body
      const mcpResponse = await server.handleRequest(mcpRequest)
      return response.json(mcpResponse)
    } catch (error) {
      console.error('MCP Handler error:', error)
      return response.status(500).json({
        jsonrpc: '2.0',
        id: request.body?.id || null,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      })
    }
  }
}
