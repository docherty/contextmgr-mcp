// Socket-based test
import net from 'net';
import { randomBytes } from 'crypto';
import process from 'process';

const port = 44556;

// Test server
if (process.argv[2] === 'server') {
  const server = net.createServer((socket) => {
    process.stderr.write('Server: Client connected\n');

    socket.on('data', (data) => {
      const message = data.toString().trim();
      process.stderr.write(`Server received: ${message}\n`);
      
      // Send response
      socket.write('Response from server\n');
      process.stderr.write('Server sent response\n');
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
    
    // Send message
    client.write('Message from client\n');
    process.stderr.write('Client sent message\n');
  });

  client.on('data', (data) => {
    const message = data.toString().trim();
    process.stderr.write(`Client received: ${message}\n`);
    client.end();
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
