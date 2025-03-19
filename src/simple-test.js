// Simple test of message passing
import { Transform } from 'node:stream';
import process from 'process';

// Create a transform stream for line-based processing
class LineProtocol extends Transform {
  constructor(options = {}) {
    super(options);
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    // Add new data to buffer
    this.buffer += chunk.toString();
    
    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep partial line
    
    // Push complete lines
    for (const line of lines) {
      this.push(line + '\n');
    }
    
    callback();
  }

  _flush(callback) {
    // Push any remaining data
    if (this.buffer) {
      this.push(this.buffer + '\n');
    }
    callback();
  }
}

// Test server
if (process.argv[2] === 'server') {
  process.stderr.write('Server starting\n');
  
  // Create protocol handler
  const protocol = new LineProtocol();
  
  // Pipe stdin through protocol
  process.stdin.pipe(protocol);
  
  // Handle messages
  protocol.on('data', (data) => {
    const message = data.toString().trim();
    process.stderr.write(`Server received: ${message}\n`);
    
    // Send response
    process.stdout.write('Response from server\n');
    process.stderr.write('Server sent response\n');
  });

  process.stderr.write('Server ready\n');
}

// Test client
else {
  process.stderr.write('Client starting\n');
  
  // Create protocol handler
  const protocol = new LineProtocol();
  
  // Pipe stdin through protocol
  process.stdin.pipe(protocol);
  
  // Send message
  process.stdout.write('Message from client\n');
  process.stderr.write('Client sent message\n');
  
  // Handle responses
  protocol.on('data', (data) => {
    const message = data.toString().trim();
    process.stderr.write(`Client received: ${message}\n`);
    process.exit(0);
  });
  
  // Timeout
  setTimeout(() => {
    process.stderr.write('Client timeout\n');
    process.exit(1);
  }, 1000);
}

// Error handling
process.on('uncaughtException', (error) => {
  process.stderr.write(`Error: ${error}\n`);
  process.exit(1);
});

// Handle pipe closure
process.stdin.on('end', () => {
  process.stderr.write('stdin ended\n');
});
