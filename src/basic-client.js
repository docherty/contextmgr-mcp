// Basic MCP client test
import { Buffer } from 'node:buffer';
import process from 'process';

// Function to write JSON-RPC message with Content-Length header
const writeMessage = (message) => {
  // Convert message to JSON and then to buffer to ensure proper handling
  const jsonStr = JSON.stringify(message);
  const contentBuffer = Buffer.from(jsonStr, 'utf8');
  const headerStr = `Content-Length: ${contentBuffer.length}\r\n\r\n`;
  const headerBuffer = Buffer.from(headerStr, 'utf8');
  
  // Write both buffers
  process.stdout.write(headerBuffer);
  process.stdout.write(contentBuffer);
  
  console.error('[DEBUG] Sent message:', jsonStr);
};

// Send initialize request
const initialize = () => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  };
  writeMessage(request);
  console.error('[DEBUG] Sent initialize request');
};

// Buffer to accumulate incoming data
let buffer = '';
let contentLength = null;

// Handle messages
const handleMessage = (msg) => {
  console.error('[DEBUG] Processing message:', msg);
  try {
    const response = JSON.parse(msg);
    if (response.id === 1) {
      console.error('[DEBUG] Got initialize response:', JSON.stringify(response));
      process.exit(0);
    }
  } catch (error) {
    console.error('[ERROR] Failed to parse response:', error);
    process.exit(1);
  }
};

// Set up stdin handling
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  console.error('[DEBUG] Received raw chunk:', chunk);
  buffer += chunk;

  // Process complete messages
  while (buffer.length > 0) {
    if (contentLength === null) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!match) {
        if (buffer.includes('\r\n\r\n')) {
          // Invalid header
          console.error('[ERROR] Invalid header in:', buffer);
          process.exit(1);
        }
        return; // Wait for complete header
      }
      contentLength = parseInt(match[1], 10);
      buffer = buffer.substring(match[0].length);
      console.error('[DEBUG] Found content length:', contentLength);
    }

    if (buffer.length >= contentLength) {
      const message = buffer.substring(0, contentLength);
      buffer = buffer.substring(contentLength);
      contentLength = null;
      console.error('[DEBUG] Processing complete message of length:', message.length);
      handleMessage(message);
    } else {
      console.error('[DEBUG] Waiting for more data. Have:', buffer.length, 'need:', contentLength);
      break; // Wait for more data
    }
  }
});

process.stdin.on('end', () => {
  console.error('[DEBUG] Connection closed');
  process.exit(0);
});

// Set up error handling
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[ERROR] Unhandled rejection:', error);
  process.exit(1);
});

// Start test
console.error('[DEBUG] Starting basic client test');
initialize();
