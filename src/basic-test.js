// Basic test of MCP communication
import { Buffer } from 'node:buffer';
import process from 'process';

// Helper to write protocol messages
const writeMessage = (obj) => {
  // Convert object to buffer directly
  const parts = [];
  
  // Start message
  parts.push(Buffer.from('{'));
  
  // Add jsonrpc
  parts.push(Buffer.from('"jsonrpc":"2.0"'));
  
  // Add id
  parts.push(Buffer.from(',"id":' + obj.id));
  
  if (obj.method) {
    // Request message
    parts.push(Buffer.from(',"method":"' + obj.method + '"'));
    parts.push(Buffer.from(',"params":{}'));
  } else {
    // Response message 
    parts.push(Buffer.from(',"result":{"version":"1.0.0","capabilities":{"tools":{}}}'));
  }
  
  // End message
  parts.push(Buffer.from('}'));
  
  // Combine into single buffer
  const content = Buffer.concat(parts);
  
  // Create header
  const header = Buffer.from(`Content-Length: ${content.length}\r\n\r\n`);
  
  // Write message
  process.stdout.write(Buffer.concat([header, content]));
  console.error('[DEBUG] Wrote message:', content.toString());
};

// Buffer for accumulating raw bytes
let rawBuffer = Buffer.alloc(0);
let expectedLength = null;

// Handler for raw data
const handleRawData = (chunk) => {
  // Append new data to buffer
  rawBuffer = Buffer.concat([rawBuffer, chunk instanceof Buffer ? chunk : Buffer.from(chunk)]);
  
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
          writeMessage({ id: parsed.id });
          console.error('[DEBUG] Sent response');
        }
      } catch (error) {
        console.error('[ERROR] Failed to parse message:', error);
      }
    } else {
      console.error('[DEBUG] Waiting for more data. Have:', rawBuffer.length, 'need:', expectedLength);
      break; // Wait for more data
    }
  }
};

// Set up raw data handling
process.stdin.on('data', handleRawData);

process.stdin.on('end', () => {
  console.error('[DEBUG] stdin ended');
  process.exit(0);
});

// Ready to receive messages
console.error('Basic MCP test server ready');
