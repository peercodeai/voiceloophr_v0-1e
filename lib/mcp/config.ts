/**
 * MCP Configuration for VoiceLoop HR
 * Centralized configuration for all MCP servers and clients
 */

import { MCPServerConfig } from './client'

export interface MCPConfig {
  servers: {
    openai: MCPServerConfig
    calendar: MCPServerConfig
  }
  client: {
    timeout: number
    retries: number
  }
}

export const defaultMCPConfig: MCPConfig = {
  servers: {
    openai: {
      name: 'openai-mcp-server',
      url: process.env.OPENAI_MCP_SERVER_URL || 'http://localhost:3001',
      timeout: 30000,
      retries: 3
    },
    calendar: {
      name: 'calendar-mcp-server', 
      url: process.env.CALENDAR_MCP_SERVER_URL || 'http://localhost:3002',
      timeout: 30000,
      retries: 3
    }
  },
  client: {
    timeout: 30000,
    retries: 3
  }
}

/**
 * Get MCP configuration with environment overrides
 */
export function getMCPConfig(): MCPConfig {
  return {
    servers: {
      openai: {
        name: 'openai-mcp-server',
        url: process.env.OPENAI_MCP_SERVER_URL || 'http://localhost:3001',
        timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
        retries: parseInt(process.env.MCP_RETRIES || '3')
      },
      calendar: {
        name: 'calendar-mcp-server',
        url: process.env.CALENDAR_MCP_SERVER_URL || 'http://localhost:3002', 
        timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
        retries: parseInt(process.env.MCP_RETRIES || '3')
      }
    },
    client: {
      timeout: parseInt(process.env.MCP_CLIENT_TIMEOUT || '30000'),
      retries: parseInt(process.env.MCP_CLIENT_RETRIES || '3')
    }
  }
}
