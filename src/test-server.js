// Debug server that reads raw input
import { ReadBuffer } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

process.stderr.write('=== Debug Server Starting ===\n');

const readBuffer = new ReadBuffer();

process.stdin.on('data', (chunk) => {
  process.stderr.write('\n=== Raw Chunk ===\n');
  process.stderr.write('As string: ' + chunk.toString());
  process.stderr.write('\nAs hex: ' + chunk.toString('hex') + '\n');
  
  readBuffer.append(chunk);
  
  try {
    const message = readBuffer.readMessage();
    if (message) {
      process.stderr.write('\n=== Parsed Message ===\n');
      process.stderr.write(JSON.stringify(message, null, 2) + '\n');
    } else {
      process.stderr.write('\nNo complete message yet\n');
    }
  } catch (error) {
    process.stderr.write('\n=== Parse Error ===\n');
    process.stderr.write(error.message + '\n');
    process.stderr.write(error.stack + '\n');
  }
});

process.stderr.write('Waiting for input...\n');
