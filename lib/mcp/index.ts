/**
 * MCP (Model Context Protocol) Module
 * Exports for MCP Client and Server functionality
 */

export * from './client'
export * from './server'

// Re-export commonly used types
export type {
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPResource,
  MCPServerConfig
} from './client'

export type {
  MCPToolHandler,
  MCPResourceHandler,
  MCPServerOptions
} from './server'
