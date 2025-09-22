/**
 * MCP Client Module for VoiceLoop HR
 * Handles communication with MCP Servers using JSON-RPC 2.0
 */

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPServerConfig {
  name: string
  url: string
  timeout?: number
  retries?: number
}

export class MCPClient {
  private servers: Map<string, MCPServerConfig> = new Map()
  private requestId = 0

  constructor() {
    // Initialize with default configurations
  }

  /**
   * Register an MCP Server
   */
  registerServer(name: string, config: MCPServerConfig): void {
    this.servers.set(name, {
      timeout: 30000,
      retries: 3,
      ...config
    })
  }

  /**
   * Send a request to a specific MCP Server
   */
  async sendRequest(
    serverName: string, 
    method: string, 
    params?: any
  ): Promise<any> {
    const server = this.servers.get(serverName)
    if (!server) {
      throw new Error(`MCP Server '${serverName}' not found`)
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    }

    try {
      const response = await this.makeRequest(server, request)
      
      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`)
      }

      return response.result
    } catch (error) {
      console.error(`MCP request failed for ${serverName}:`, error)
      throw error
    }
  }

  /**
   * List available tools from a server
   */
  async listTools(serverName: string): Promise<MCPTool[]> {
    const result = await this.sendRequest(serverName, 'tools/list')
    return result.tools || []
  }

  /**
   * List available resources from a server
   */
  async listResources(serverName: string): Promise<MCPResource[]> {
    const result = await this.sendRequest(serverName, 'resources/list')
    return result.resources || []
  }

  /**
   * Call a tool on a server
   */
  async callTool(
    serverName: string, 
    toolName: string, 
    arguments_: any
  ): Promise<any> {
    const result = await this.sendRequest(serverName, 'tools/call', {
      name: toolName,
      arguments: arguments_
    })
    // Handle MCP response format - extract content if it's wrapped
    if (result && result.content && Array.isArray(result.content)) {
      try {
        // Try to parse JSON content
        const content = result.content[0]
        if (content && content.text) {
          return JSON.parse(content.text)
        }
      } catch {
        // If parsing fails, return the raw result
        return result
      }
    }
    return result
  }

  /**
   * Read a resource from a server
   */
  async readResource(
    serverName: string, 
    uri: string
  ): Promise<any> {
    return this.sendRequest(serverName, 'resources/read', { uri })
  }

  /**
   * Make HTTP request to MCP Server
   */
  private async makeRequest(
    server: MCPServerConfig, 
    request: MCPRequest
  ): Promise<MCPResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), server.timeout)

    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data as MCPResponse
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${server.timeout}ms`)
      }
      
      throw error
    }
  }

  /**
   * Get server configuration
   */
  getServerConfig(serverName: string): MCPServerConfig | undefined {
    return this.servers.get(serverName)
  }

  /**
   * List all registered servers
   */
  listServers(): string[] {
    return Array.from(this.servers.keys())
  }
}

// Singleton instance for the application
export const mcpClient = new MCPClient()
