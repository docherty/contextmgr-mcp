// MCP test with reliable transport
import net from 'net';
import { Buffer } from 'node:buffer';
import process from 'process';

const port = 44557;

// Message framing helper
const writeMessage = (socket, message) => {
  const jsonStr = JSON.stringify(message);
  const content = Buffer.from(jsonStr);
  const header = Buffer.from(`Content-Length: ${content.length}\r\n\r\n`);
  socket.write(Buffer.concat([header, content]));
};

// Test server
if (process.argv[2] === 'server') {
  const server = net.createServer((socket) => {
    process.stderr.write('Server: Client connected\n');

    let buffer = '';
    let expectedLength = null;

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process messages
      while (buffer.length > 0) {
        if (expectedLength === null) {
          const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
          if (!match) return;
          
          expectedLength = parseInt(match[1], 10);
          buffer = buffer.substring(match[0].length);
        }

        if (buffer.length >= expectedLength) {
          const message = buffer.substring(0, expectedLength);
          buffer = buffer.substring(expectedLength);
          expectedLength = null;

          try {
            const parsed = JSON.parse(message);
            if (parsed.method === 'initialize') {
              process.stderr.write('Server: Got initialize request\n');
              writeMessage(socket, {
                jsonrpc: '2.0',
                id: parsed.id,
                result: {
                  version: '1.0.0',
                  capabilities: {
                    tools: {}
                  }
                }
              });
              process.stderr.write('Server: Sent initialize response\n');
            }
          } catch (error) {
            process.stderr.write(`Server error: ${error}\n`);
          }
        }
      }
    });

    socket.on('end', () => {
      process.stderr.write('Server: Client disconnected\n');
      server.close();
    });
  });

  server.listen(port, () => {
    process.stderr.write(`Server listening on port ${port}\n`);
  });

  server.on('close', () => {
    process.stderr.write('Server closed\n');
    process.exit(0);
  });
}

// Test client
else {
  process.stderr.write('Client starting\n');

  const client = new net.Socket();

  client.connect(port, 'localhost', () => {
    process.stderr.write('Client connected\n');
    
    // Send initialize request
    writeMessage(client, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });
    process.stderr.write('Client sent initialize request\n');
  });

  let buffer = '';
  let expectedLength = null;

  client.on('data', (chunk) => {
    buffer += chunk.toString();
    
    // Process messages
    while (buffer.length > 0) {
      if (expectedLength === null) {
        const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
        if (!match) return;
        
        expectedLength = parseInt(match[1], 10);
        buffer = buffer.substring(match[0].length);
      }

      if (buffer.length >= expectedLength) {
        const message = buffer.substring(0, expectedLength);
        buffer = buffer.substring(expectedLength);
        expectedLength = null;

        try {
          const parsed = JSON.parse(message);
          if (parsed.id === 1) {
            process.stderr.write('Client: Got initialize response\n');
            client.end();
          }
        } catch (error) {
          process.stderr.write(`Client error: ${error}\n`);
          client.destroy();
          process.exit(1);
        }
      }
    }
  });

  client.on('close', () => {
    process.stderr.write('Client connection closed\n');
    process.exit(0);
  });

  // Timeout in case no response
  setTimeout(() => {
    process.stderr.write('Client timeout\n');
    client.destroy();
    process.exit(1);
  }, 1000);
}

// Error handling
process.on('uncaughtException', (error) => {
  process.stderr.write(`Error: ${error}\n`);
  process.exit(1);
});
