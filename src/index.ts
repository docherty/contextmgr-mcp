import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { mkdir } from 'fs/promises';
import path from 'path';
import { ContextConfig, Result } from './types.js';
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

export class ContextmgrServer {
  private server: Server;
  private config: ContextConfig;
  private stateManager!: StateManager;
  private registeredTools: Map<string, any> = new Map();

  constructor(config: ContextConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'contextmgr-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Setup error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async ensureContextDir(): Promise<string> {
    const contextDir = path.join(
      this.config.projectRoot,
      this.config.contextDir || 'contextmgr'
    );
    await mkdir(contextDir, { recursive: true });
    
    // Create subdirectories
    await Promise.all([
      mkdir(path.join(contextDir, 'checkpoints'), { recursive: true }),
      mkdir(path.join(contextDir, 'temp'), { recursive: true })
    ]);

    return contextDir;
  }

  private async registerTools(): Promise<void> {
    // Project tools
    this.registerTool(new CreateProjectTool(this.stateManager));
    this.registerTool(new GetProjectTool(this.stateManager));
    this.registerTool(new CreateProjectCheckpointTool(this.stateManager));
    this.registerTool(new RestoreProjectCheckpointTool(this.stateManager));

    // Work package tools
    this.registerTool(new CreateWorkPackageTool(this.stateManager));
    this.registerTool(new GetWorkPackageTool(this.stateManager));
    this.registerTool(new UpdateWorkPackageProgressTool(this.stateManager));
    this.registerTool(new UpdateWorkPackageStatusTool(this.stateManager));

    // Task tools
    this.registerTool(new CreateTaskTool(this.stateManager));
    this.registerTool(new UpdateTaskStatusTool(this.stateManager));
    this.registerTool(new RecordFileChangeTool(this.stateManager));
    this.registerTool(new CreateTaskCheckpointTool(this.stateManager));
    this.registerTool(new RestoreTaskCheckpointTool(this.stateManager));

    // QA tools
    this.registerTool(new StartQAReviewTool(this.stateManager));
    this.registerTool(new CompleteQAReviewTool(this.stateManager));
    this.registerTool(new RequestFixesTool(this.stateManager));
    this.registerTool(new AcceptWorkPackageTool(this.stateManager));
  }

  private registerTool(tool: any): void {
    this.registeredTools.set(tool.name, tool);
  }

  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.registeredTools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }));

    // Handle tool execution
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        try {
          const result = await this.executeTool(
            request.params.name,
            request.params.arguments
          );

          if (!result.success) {
            throw new McpError(ErrorCode.InternalError, result.error);
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result.data, null, 2)
            }]
          };
        } catch (error) {
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
  }

  private async executeTool(name: string, args: any): Promise<Result<any>> {
    const tool = this.registeredTools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${name} not found`
      };
    }

    return tool.handler(args);
  }

  public async initialize(): Promise<void> {
    const contextDir = await this.ensureContextDir();
    this.stateManager = new StateManager(contextDir);
    await this.stateManager.initialize();
    
    await this.registerTools();
    this.setupRequestHandlers();
  }

  public async start(): Promise<void> {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Contextmgr MCP server running on stdio');
  }
}

// If running directly (not imported as a module)
if (process.argv[1] === import.meta.url) {
  const server = new ContextmgrServer({
    projectRoot: process.cwd()
  });
  server.start().catch(console.error);
}
