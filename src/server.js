// Server test - run in one terminal
import { ContextmgrServer } from './index.js';

console.log('Starting test server...');
const server = new ContextmgrServer({
  projectRoot: process.cwd()
});

server.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
