// Client test - run in another terminal
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function runTest() {
  try {
    console.log('Creating MCP client...');
    const transport = new StdioClientTransport();
    
    // Set up transport handlers before creating client
    transport.onclose = () => {
      console.log('Transport closed');
      process.exit(0);
    };

    transport.onerror = (error) => {
      console.error('Transport error:', error);
    };

    transport.onmessage = (msg) => {
      console.log('Client received:', JSON.stringify(msg, null, 2));
    };
    
    console.log('Creating client...');
    const client = new Client(transport);

    console.log('Connecting...');
    await client.connect();
    console.log('Connected');

    console.log('Getting tools...');
    const tools = await client.listTools();
    console.log('Tools:', JSON.stringify(tools, null, 2));

    console.log('Test complete');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

runTest().catch(error => {
  console.error('Uncaught error:', error);
  process.exit(1);
});
