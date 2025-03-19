// Basic test of MCP communication
import { Buffer } from 'node:buffer';
import process from 'process';

// Function to write JSON-RPC message with Content-Length header
const writeMessage = (message) => {
  // Convert message to JSON string
  const jsonStr = JSON.stringify(message).replace(/"/g, '\\"');
  
  // Create message with escaped quotes
  const content = `{"jsonrpc":"2.0","id":${message.id}${
    message.method ? `,"method":"${message.method}","params":${JSON.stringify(message.params)}}` :
    `,"result":{"version":"1.0.0","capabilities":{"tools":{}}}}`
  }`;

  const contentLength = Buffer.byteLength(content);
  const header = `Content-Length: ${contentLength}\r\n\r\n`;

  // Write header and content in a single write
  const fullMessage = Buffer.concat([
    Buffer.from(header),
    Buffer.from(content)
  ]);

  process.stdout.write(fullMessage, (err) => {
    if (err) {
      console.error('[ERROR] Write error:', err);
    } else {
      console.error('[DEBUG] Write complete:', content);
    }
  });
};

// Buffer for accumulating raw bytes
let rawBuffer = Buffer.alloc(0);
let expectedLength = null;

// Handler for raw data
const handleRawData = (chunk) => {
  // Append new data to buffer
  rawBuffer = Buffer.concat([rawBuffer, chunk]);
  
  // Process messages in buffer
  while (rawBuffer.length > 0) {
    if (expectedLength === null) {
      // Look for header
      const headerEnd = rawBuffer.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) {
        return; // Wait for complete header
      }
      
      const header = rawBuffer.slice(0, headerEnd).toString();
      const match = header.match(/Content-Length: (\d+)/);
      if (!match) {
        console.error('[ERROR] Invalid header:', header);
        process.exit(1);
      }
      
      expectedLength = parseInt(match[1], 10);
      rawBuffer = rawBuffer.slice(headerEnd + 4); // Skip \r\n\r\n
      
      console.error('[DEBUG] Found content length:', expectedLength);
    }

    if (rawBuffer.length >= expectedLength) {
      const messageBuffer = rawBuffer.slice(0, expectedLength);
      rawBuffer = rawBuffer.slice(expectedLength);
      expectedLength = null;

      const message = messageBuffer.toString();
      console.error('[DEBUG] Received message:', message);

      try {
        const parsed = JSON.parse(message);
        if (parsed.method === 'initialize') {
          // Send initialize response
          const response = {
            id: parsed.id
          };
          writeMessage(response);
          console.error('[DEBUG] Sent initialize response');
        }
      } catch (error) {
        console.error('[ERROR] Failed to parse message:', error);
      }
    } else {
      return; // Wait for more data
    }
  }
};

// Set up raw buffer handling
process.stdin.on('data', handleRawData);

process.stdin.on('end', () => {
  console.error('[DEBUG] stdin ended');
  process.exit(0);
});

// Make sure stderr is flushed
process.stderr.write('Basic MCP test server ready\n', () => {
  process.stderr.write('[DEBUG] Server initialized\n');
});
