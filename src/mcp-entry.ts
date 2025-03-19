#!/usr/bin/env node
import { McpServer } from './server/mcp-server.js';
import { ToolDefinition } from './server/tool-registry.js';
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
import { StateManager } from './state/manager.js';

// Enable debug logging if DEBUG environment variable is set
const DEBUG = process.env.DEBUG === '1';
const log = (msg: string) => process.stderr.write(`[MCP] ${msg}\n`);
const debug = DEBUG ? (msg: string) => process.stderr.write(`[DEBUG] ${msg}\n`) : () => {};

async function main() {
  try {
    log('Starting MCP Server...');
    debug(`Working directory: ${process.cwd()}`);
    debug(`Entry point: ${import.meta.url}`);

    // Create MCP server instance
    const server = new McpServer({
      port: parseInt(process.env.MCP_PORT || '44557', 10),
      serverInfo: {
        name: 'contextmgr-mcp',
        version: '1.0.0'
      }
    });

    // Initialize state manager
    const stateManager = new StateManager(process.cwd());
    await stateManager.initialize();
    debug('State manager initialized');

    // Register all tools
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

    for (const ToolClass of toolClasses) {
      const tool = new ToolClass(stateManager);
      const toolDefinition: ToolDefinition = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (args) => {
          const result = await tool.handler(args);
          if (!result.success) {
            throw new Error(result.error || 'Unknown error');
          }
          return result.data;
        }
      };
      server.registerTool(toolDefinition);
      debug(`Registered tool: ${tool.name}`);
    }

    // Set up error handling
    server.on('error', (error) => {
      log(`Server error: ${error.message}`);
      if (DEBUG) {
        console.error(error);
      }
    });

    // Set up connection event handling
    server.on('client:connect', () => {
      log('Client connected');
    });

    server.on('client:disconnect', () => {
      log('Client disconnected');
    });

    server.on('session:created', (session) => {
      debug(`Session created: ${session.id}`);
    });

    server.on('session:initialized', (session) => {
      debug(`Session initialized: ${session.id}`);
    });

    server.on('session:closed', (session) => {
      debug(`Session closed: ${session.id}`);
    });

    // Handle process signals
    process.on('SIGINT', async () => {
      log('Shutting down...');
      await server.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      log('Shutting down...');
      await server.shutdown();
      process.exit(0);
    });

    // Start the server
    await server.start();
    log(`MCP Server running on port ${process.env.MCP_PORT || 44557}`);

  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run server if this is the main module
if (process.argv[1] === import.meta.url) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
