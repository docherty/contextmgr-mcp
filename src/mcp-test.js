import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Readable, Writable } from 'stream';
import fs from 'fs';
import util from 'util';

// Debug log that ensures proper JSON formatting
const debugLog = fs.createWriteStream('debug.log', { flags: 'w' });
const debug = (msg, ...args) => {
  debugLog.write('='.repeat(80) + '\n');
  debugLog.write(`${msg}\n`);
  if (args.length > 0) {
    args.forEach((arg, i) => {
      debugLog.write(`Arg ${i}:\n`);
      if (typeof arg === 'string') {
        // Show raw string content
        debugLog.write(`Raw: ${arg}\n`);
        debugLog.write(`Hex: ${Buffer.from(arg).toString('hex')}\n`);
      } else {
        // Pretty print objects
        debugLog.write(util.inspect(arg, { depth: null, colors: false }) + '\n');
      }
    });
  }
  debugLog.write('='.repeat(80) + '\n');
};

class MemoryStream extends Readable {
  constructor(options) {
    super(options);
    this.buffer = Buffer.from('');
  }
  
  _read() {}
  
  write(data) {
    debug('Writing to stream', data.toString());
    this.push(data);
    return true;
  }
}

const inStream = new MemoryStream();
const outStream = new Writable({
  write(chunk, encoding, callback) {
    debug('Server output', chunk.toString());
    callback();
  }
});

debug('Creating server');
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

const ListToolsSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('list_tools'),
  params: z.object({}),
  id: z.number()
});

server.setRequestHandler(ListToolsSchema, async (request) => {
  debug('Handling request', request);
  return {
    tools: [{
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: { type: 'object', properties: {} }
    }]
  };
});

server.onerror = (error) => {
  debug('Server error', error);
};

async function runTest() {
  try {
    const transport = new StdioServerTransport(inStream, outStream);
    await server.connect(transport);
    debug('Server ready');

    // Create message without any string manipulation
    const message = Buffer.from(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'list_tools',
        params: {},
        id: 1
      }) + '\n',
      'utf8'
    );

    debug('Sending message', message.toString());
    inStream.write(message);
    debug('Request sent');

    // Keep process alive briefly to see response
    await new Promise(resolve => setTimeout(resolve, 500));
    debugLog.end();
  } catch (error) {
    debug('Error during test', error);
    debugLog.end();
    process.exit(1);
  }
}

runTest();
