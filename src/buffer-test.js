// Test using Buffer to ensure correct message handling
import { Buffer } from 'node:buffer';

// Test JSON messages
const messages = {
  request: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  },
  response: {
    jsonrpc: '2.0',
    id: 1,
    result: {
      version: '1.0.0',
      capabilities: {
        tools: {}
      }
    }
  }
};

// Convert to JSON and examine bytes
for (const [type, msg] of Object.entries(messages)) {
  console.log(`\nTesting ${type}:`);
  
  // Standard JSON.stringify
  const jsonStr = JSON.stringify(msg);
  console.log('JSON string:', jsonStr);
  
  // Convert to buffer and examine bytes
  const buf = Buffer.from(jsonStr);
  console.log('Buffer length:', buf.length);
  console.log('Buffer contents (hex):', buf.toString('hex'));
  console.log('Buffer contents (ascii):');
  for (let i = 0; i < buf.length; i++) {
    console.log(`  ${i}: ${String.fromCharCode(buf[i])} (${buf[i]})`);
  }
  
  // Manual JSON construction
  const parts = [];
  for (const [key, value] of Object.entries(msg)) {
    parts.push(`"${key}":${JSON.stringify(value)}`);
  }
  const manualJson = `{${parts.join(',')}}`;
  console.log('\nManual JSON:', manualJson);
  console.log('Matches stringify?', manualJson === jsonStr);
  
  // Test parsing
  try {
    const parsed = JSON.parse(manualJson);
    console.log('Parse successful:', JSON.stringify(parsed) === JSON.stringify(msg));
  } catch (error) {
    console.log('Parse error:', error);
  }
}
