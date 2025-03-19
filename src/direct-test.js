// Direct test using stdio
// Import minimal deps
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import process from 'process';
import fs from 'fs';

// Debug log
const log = fs.createWriteStream('client.log', { flags: 'w' });
const debug = (msg, ...args) => {
  log.write(`[DEBUG] ${msg}\n`);
  if (args.length > 0) {
    log.write(JSON.stringify(args, null, 2) + '\n');
  }
  log.write('\n'); // Add newline for readability
};

async function runTest() {
  try {
    debug('Creating client...');
    const transport = new StdioClientTransport();
    
    // Debug transport events
    transport.onmessage = (msg) => {
      debug('Client received message:', msg);
    };

    debug('Creating MCP client');
    const client = new Client(transport);

    debug('Connecting...');
    await client.connect();
    debug('Connected');

    debug('Getting tools...');
    const tools = await client.listTools();
    debug('Got tools:', tools);

    debug('Test complete');
    log.end();
    process.exit(0);
  } catch (error) {
    debug('Error:', error);
    log.end();
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  debug('Uncaught Exception:', error);
  log.end();
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  debug('Unhandled Rejection:', error);
  log.end();
  process.exit(1);
});

runTest().catch(error => {
  debug('Uncaught error:', error);
  log.end();
  process.exit(1);
});
