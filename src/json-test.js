// Test JSON message formatting
import assert from 'assert';

// Test message creation
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {}
};

const response = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    version: '1.0.0',
    capabilities: {
      tools: {}
    }
  }
};

// Test JSON serialization
const requestStr = JSON.stringify(request);
const responseStr = JSON.stringify(response);

// Verify proper formatting with commas
assert.strictEqual(
  requestStr,
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}',
  'Request format incorrect'
);

assert.strictEqual(
  responseStr,
  '{"jsonrpc":"2.0","id":1,"result":{"version":"1.0.0","capabilities":{"tools":{}}}}',
  'Response format incorrect'
);

// Validate round-trip
const parsedRequest = JSON.parse(requestStr);
const parsedResponse = JSON.parse(responseStr);

// Verify structure
assert.deepStrictEqual(parsedRequest, request, 'Request roundtrip failed');
assert.deepStrictEqual(parsedResponse, response, 'Response roundtrip failed');

console.log('Correct request format:', requestStr);
console.log('Correct response format:', responseStr);
console.log('JSON validation successful');
