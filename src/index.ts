import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  InitializeRequestSchema,
  ListToolsRequestSchema,
  McpError,
  JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';
import { mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import { ContextConfig, Result, Tool } from './types.js';
import { StateManager } from './state/manager.js';
import {
  CreateProjectTool,
  GetProjectTool,
  CreateProjectCheckpointTool,
  RestoreProjectCheckpointTool
} from './tools/project.js';
import {
  CreateWorkPackageTool,
  GetWorkPackageTool,
  UpdateWorkPackageProgressTool,
  UpdateWorkPackageStatusTool
} from './tools/workpackage.js';
import {
  CreateTaskTool,
  UpdateTaskStatusTool,
  RecordFileChangeTool,
  CreateTaskCheckpointTool,
  RestoreTaskCheckpointTool
} from './tools/task.js';
import {
  StartQAReviewTool,
  CompleteQAReviewTool,
  RequestFixesTool,
  AcceptWorkPackageTool
} from './tools/qa.js';

// Initial synchronous debug output
process.stderr.write('=== MCP Server Starting ===\n');
process.stderr.write(`Environment: DEBUG=${process.env.DEBUG}\n`);
process.stderr.write(`Working Directory: ${process.cwd()}\n`);
process.stderr.write(`Module URL: ${import.meta.url}\n`);
process.stderr.write(`Entry Point: ${process.argv[1]}\n`);

// Check stdin mode
process.stderr.write('Stdin Status:\n');
process.stderr.write(`  isTTY: ${process.stdin.isTTY}\n`);
process.stderr.write(`  readable: ${process.stdin.readable}\n`);
process.stderr.write(`  isPaused: ${process.stdin.isPaused()}\n`);

// Enhanced stdin data logging
process.stdin.on('data', (data) => {
  process.stderr.write('=== Received stdin data ===\n');
  process.stderr.write('As string: ' + data.toString() + '\n');
  process.stderr.write('As buffer: ' + data.toString('hex') + '\n');
  process.stderr.write('Length: ' + data.length + '\n');
  process.stderr.write('========================\n');
});

const DEBUG = process.env.DEBUG === '1';

// Always log important messages, debug for details
const log = (msg: string) => process.stderr.write(`[MCP] ${msg}\n`);
const debug = (msg: string, ...args: any[]) => {
  if (DEBUG) {
    process.stderr.write(`[DEBUG] ${msg}\n`);
    if (args.length > 0) {
      process.stderr.write(JSON.stringify(args, null, 2) + '\n');
    }
  }
};

// Log uncaught errors
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled Rejection: ${reason}`);
  console.error(reason);
  process.exit(1);
});

export class ContextmgrServer {
  private server: Server;
  private config: ContextConfig;
  private stateManager!: StateManager;
  private registeredTools: Map<string, Tool> = new Map();

  constructor(config: ContextConfig) {
    this.config = config;
    log('Creating server instance');

    log('Setting up server capabilities');
    this.server = new Server(
      {
        name: 'contextmgr-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}  // Will be populated during initialization
        },
      }
    );

    this.server.onerror = (error) => {
      log(`Error: ${error}`);
      debug('Error details:', error);
    };
    
    // Debug pipe status
    process.stdout.on('error', (error) => {
      log(`Stdout error: ${error}`);
      debug('Stdout error details:', error);
    });

    process.stdout.on('close', () => {
      log('Stdout closed');
    });

    process.stdin.on('close', () => {
      log('Stdin closed');
    });

    process.on('SIGINT', async () => {
      log('Shutting down...');
      await this.server.close();
      process.exit(0);
    });

    log('Server instance created');
  }

  private async ensureContextDir(): Promise<string> {
    const contextDir = path.join(
      this.config.projectRoot,
      this.config.contextDir || 'contextmgr'
    );
    log(`Ensuring context directory: ${contextDir}`);
    await mkdir(contextDir, { recursive: true });
    
    await Promise.all([
      mkdir(path.join(contextDir, 'checkpoints'), { recursive: true }),
      mkdir(path.join(contextDir, 'temp'), { recursive: true })
    ]);

    return contextDir;
  }

  private async registerTools(): Promise<void> {
    log('Registering tools with state manager');
    
    const toolClasses = [
      CreateProjectTool,
      GetProjectTool,
      CreateProjectCheckpointTool,
      RestoreProjectCheckpointTool,
      CreateWorkPackageTool,
      GetWorkPackageTool,
      UpdateWorkPackageProgressTool,
      UpdateWorkPackageStatusTool,
      CreateTaskTool,
      UpdateTaskStatusTool,
      RecordFileChangeTool,
      CreateTaskCheckpointTool,
      RestoreTaskCheckpointTool,
      StartQAReviewTool,
      CompleteQAReviewTool,
      RequestFixesTool,
      AcceptWorkPackageTool
    ];

    log('Initializing tools');
    debug('Tool classes:', toolClasses.map(tc => tc.name));

    for (const ToolClass of toolClasses) {
      const tool = new ToolClass(this.stateManager);
      this.registerTool(tool);
      debug('Registered tool:', tool.name);
    }

    log(`Registered ${this.registeredTools.size} tools`);
  }

  private registerTool(tool: Tool): void {
    debug('Registering tool:', tool.name);
    this.registeredTools.set(tool.name, tool);
  }

  private setupRequestHandlers(): void {
    log('Setting up request handlers');
    
    // Handle initialization
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      log(`Handling initialize request: ${JSON.stringify(request)}`);
      const response = {
        version: '1.0.0',
        capabilities: {
          tools: Object.fromEntries(
            Array.from(this.registeredTools.entries()).map(([name, tool]) => [
              name,
              {
                description: tool.description,
                inputSchema: tool.inputSchema
              }
            ])
          )
        }
      };
      log(`Sending initialize response: ${JSON.stringify(response)}`);
      return response;
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log('Handling list_tools request');
      const tools = Array.from(this.registeredTools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      
      log(`Returning ${tools.length} tools`);
      debug('Tools response:', tools);
      return { tools };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        log(`Executing tool: ${request.params.name}`);
        try {
          const tool = this.registeredTools.get(request.params.name);
          if (!tool) {
            log(`Tool not found: ${request.params.name}`);
            throw new McpError(
              ErrorCode.InvalidParams, 
              `Tool ${request.params.name} not found`
            );
          }

          const result = await tool.handler(request.params.arguments);

          if (!result.success) {
            log(`Tool execution failed: ${result.error}`);
            throw new McpError(ErrorCode.InternalError, result.error || 'Unknown error');
          }

          log('Tool execution succeeded');
          debug('Tool result:', result.data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result.data, null, 2)
            }]
          };
        } catch (error) {
          log(`Tool execution error: ${error}`);
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    );

    log('Request handlers configured');
  }

  public async initialize(): Promise<void> {
    log('Initializing server');
    const contextDir = await this.ensureContextDir();
    log('Context directory ready');
    
    this.stateManager = new StateManager(contextDir);
    await this.stateManager.initialize();
    log('State manager initialized');
    
    await this.registerTools();
    this.setupRequestHandlers();

    log('Server initialization complete');
  }

  public async start(): Promise<void> {
    log('Starting server');
    await this.initialize();
    
    const transport = new StdioServerTransport();
    log('Created stdio transport');
    
    try {
      // Debug the incoming messages
      transport.onmessage = (message: JSONRPCMessage) => {
        debug('Raw message received:', JSON.stringify(message));
      };
      
      await this.server.connect(transport);
      log('Server running on stdio');
    } catch (error) {
      log(`Failed to start server: ${error}`);
      process.exit(1);
    }
  }
}

if (process.argv[1] === import.meta.url) {
  log('Starting in standalone mode');
  const server = new ContextmgrServer({
    projectRoot: process.cwd()
  });
  
  server.start().catch(error => {
    log(`Fatal error: ${error}`);
    process.exit(1);
  });
}
