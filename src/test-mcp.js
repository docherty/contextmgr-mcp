import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Create a simple server with just one capability
const server = new Server(
  { name: 'test-mcp', version: '1.0.0' },
  {
    capabilities: {
      tools: {
        test_tool: {
          description: 'A test tool',
          inputSchema: { type: 'object', properties: {} }
        }
      }
    }
  }
);

// Add basic handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  process.stderr.write('Handling list_tools request\n');
  return {
    tools: [{
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: { type: 'object', properties: {} }
    }]
  };
});

// Start server
process.stderr.write('Starting test MCP server...\n');
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('Server ready\n');
