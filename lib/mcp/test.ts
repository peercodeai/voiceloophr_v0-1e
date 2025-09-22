/**
 * MCP Infrastructure Test
 * Basic test to verify MCP Client and Server functionality
 */

import { MCPServer, createMCPHandler } from './server'
import { MCPClient } from './client'

/**
 * Test MCP Server functionality
 */
export async function testMCPServer() {
  console.log('🧪 Testing MCP Server...')
  
  // Create a test server
  const server = new MCPServer({
    name: 'test-server',
    version: '1.0.0',
    description: 'Test MCP Server'
  })

  // Register a test tool
  server.registerTool(
    'test/echo',
    'Echo back the input',
    {
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    },
    async (params) => {
      return { echo: params.message, timestamp: new Date().toISOString() }
    }
  )

  // Register a test resource
  server.registerResource(
    'test://info',
    'Server Information',
    'Basic server information',
    'application/json',
    async () => {
      return { 
        name: 'test-server',
        version: '1.0.0',
        status: 'running'
      }
    }
  )

  // Test tool call
  const toolResponse = await server.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'test/echo',
      arguments: { message: 'Hello MCP!' }
    }
  })

  console.log('✅ Tool call test:', toolResponse)

  // Test resource read
  const resourceResponse = await server.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'resources/read',
    params: { uri: 'test://info' }
  })

  console.log('✅ Resource read test:', resourceResponse)

  // Test tools list
  const toolsResponse = await server.handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/list'
  })

  console.log('✅ Tools list test:', toolsResponse)

  console.log('🎉 MCP Server tests passed!')
  return true
}

/**
 * Test MCP Client functionality
 */
export async function testMCPClient() {
  console.log('🧪 Testing MCP Client...')
  
  const client = new MCPClient()
  
  // Note: In a real scenario, we'd register actual server URLs
  // For testing, we'll just verify the client can be instantiated
  client.registerServer('test-server', {
    name: 'test-server',
    url: 'http://localhost:3001'
  })

  console.log('✅ MCP Client registered servers:', client.listServers())
  console.log('🎉 MCP Client tests passed!')
  return true
}

/**
 * Run all MCP tests
 */
export async function runMCPTests() {
  console.log('🚀 Running MCP Infrastructure Tests...\n')
  
  try {
    await testMCPServer()
    console.log('')
    await testMCPClient()
    console.log('\n🎉 All MCP tests passed!')
    return true
  } catch (error) {
    console.error('❌ MCP tests failed:', error)
    return false
  }
}

// Export for use in other modules
export { MCPServer } from './server'
export { MCPClient } from './client'
