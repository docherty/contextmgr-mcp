# Context Manager MCP Server

A Model Context Protocol (MCP) server implementation for managing development context and workflow.

## Features

- Socket-based transport with reliable message framing
- Full JSON-RPC 2.0 protocol support
- Session management with capability negotiation
- Extensible tool registry system
- Project, workpackage, and task management
- Checkpoint and restore functionality
- QA review workflow support

## Initial Setup

```bash
# Install dependencies
npm install

# First-time build
npm run build
```

## Usage

### Starting the Server

```bash
# Development mode (no build required, uses tsx for on-the-fly compilation)
npm run dev

# Production mode (requires build)
npm start

# Start with debug logging
DEBUG=1 npm run dev

# Start on specific port
MCP_PORT=44558 npm run dev
```

### Development Mode

```bash
# Run with hot reloading (preferred during development)
npm run dev

# Watch mode for TypeScript compilation (if you prefer running the compiled version)
npm run watch

# In a separate terminal when using watch mode
npm start
```

### Clean Start

If you encounter any issues, you can try a clean build:

```bash
# Remove build artifacts
rm -rf dist/

# Reinstall dependencies
npm ci

# Rebuild the project
npm run build

# Start in development mode
npm run dev
```

## Architecture

### Core Components

1. **Message Framing**
   - Content-Length based protocol
   - Reliable message boundary handling
   - Buffer management

2. **Transport Layer**
   - TCP socket-based communication
   - Connection management
   - Event-driven architecture

3. **Session Management**
   - Client session tracking
   - Capability negotiation
   - State persistence

4. **Tool Registry**
   - Dynamic tool registration
   - Input validation
   - Result formatting

### Tools

1. Project Management
   - Create/Get projects
   - Project checkpoints
   - State restoration

2. Work Package Management
   - Create/Get work packages
   - Progress tracking
   - Status updates

3. Task Management
   - Create/Update tasks
   - File change tracking
   - Task checkpointing

4. QA Tools
   - Review workflow
   - Fix requests
   - Work package acceptance

## Configuration

Environment variables:

- `DEBUG`: Enable debug logging (0/1)
- `MCP_PORT`: Server port (default: 44557)

## Protocol

The server implements the Model Context Protocol with JSON-RPC 2.0:

```typescript
interface MCPMessage {
  jsonrpc: "2.0";
  id: number;
  method?: string;      // for requests
  params?: any;         // for requests
  result?: any;         // for responses
  error?: {             // for error responses
    code: number;
    message: string;
    data?: any;
  };
}
```

### Message Flow

1. Client connects via TCP
2. Client sends initialize request
3. Server responds with capabilities
4. Normal message exchange begins
5. Client can shutdown/exit

## Development

See [Initial Setup](#initial-setup) and [Development Mode](#development-mode) sections above.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License
