import { BaseServer, ServerInfo } from './base-server.js';
import { SessionManager, Session } from './session-manager.js';
import { ToolRegistry, ToolDefinition } from './tool-registry.js';
import { SocketServerTransport } from '../transport/socket-transport.js';
import {
  Methods,
  ErrorCodes,
  ServerCapabilities,
  InitializeParams,
  CallToolParams,
  CallToolResult
} from './protocol-types.js';
import { McpProtocolError } from './base-server.js';

export interface McpServerOptions {
  port?: number;
  serverInfo?: ServerInfo;
}

export class McpServer extends BaseServer {
  private sessionManager: SessionManager;
  private toolRegistry: ToolRegistry;
  private socketTransport: SocketServerTransport;
  private initialized: boolean = false;

  constructor(options: McpServerOptions = {}) {
    const serverInfo: ServerInfo = options.serverInfo || {
      name: 'mcp-server',
      version: '1.0.0'
    };

    super(serverInfo, {});

    this.toolRegistry = new ToolRegistry();
    this.sessionManager = new SessionManager(serverInfo, this.toolRegistry.getCapabilities());
    this.socketTransport = new SocketServerTransport(options.port);

    this.setupEventHandlers();
    this.registerDefaultHandlers();
  }

  private setupEventHandlers(): void {
    // Handle transport events
    this.socketTransport.on('error', (error) => {
      this.emit('error', error);
    });

    this.socketTransport.on('connect', () => {
      this.emit('client:connect');
    });

    this.socketTransport.on('disconnect', () => {
      this.emit('client:disconnect');
    });

    // Handle session events
    this.sessionManager.on('session:created', (session: Session) => {
      this.emit('session:created', session);
    });

    this.sessionManager.on('session:initialized', (session: Session) => {
      this.emit('session:initialized', session);
    });

    this.sessionManager.on('session:closed', (session: Session) => {
      this.emit('session:closed', session);
    });
  }

  private registerDefaultHandlers(): void {
    // Initialize request handler
    this.setRequestHandler(Methods.Initialize, async (request) => {
      if (this.initialized) {
        throw new McpProtocolError(
          ErrorCodes.InvalidRequest,
          'Server is already initialized'
        );
      }

      const session = this.sessionManager.createSession(this.socketTransport);
      const result = await this.sessionManager.initializeSession(
        session.id,
        request.params as InitializeParams
      );

      this.initialized = true;
      return result;
    });

    // Shutdown request handler
    this.setRequestHandler(Methods.Shutdown, async () => {
      if (!this.initialized) {
        throw new McpProtocolError(
          ErrorCodes.ServerNotInitialized,
          'Server is not initialized'
        );
      }

      await this.shutdown();
      return null;
    });

    // List tools request handler
    this.setRequestHandler(Methods.ListTools, async () => {
      if (!this.initialized) {
        throw new McpProtocolError(
          ErrorCodes.ServerNotInitialized,
          'Server is not initialized'
        );
      }

      return {
        tools: this.toolRegistry.listTools().map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Call tool request handler
    this.setRequestHandler(Methods.CallTool, async (request) => {
      if (!this.initialized) {
        throw new McpProtocolError(
          ErrorCodes.ServerNotInitialized,
          'Server is not initialized'
        );
      }

      const params = request.params as CallToolParams;
      return await this.toolRegistry.executeTool(params);
    });
  }

  /**
   * Register a new tool with the server
   */
  public registerTool(tool: ToolDefinition): void {
    this.toolRegistry.registerTool(tool);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      await this.socketTransport.listen();
      await super.connect(this.socketTransport);
      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the server and cleanup
   */
  public async shutdown(): Promise<void> {
    try {
      await this.sessionManager.shutdown();
      await super.close();
      this.initialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get server capabilities
   */
  public getCapabilities(): ServerCapabilities {
    return this.toolRegistry.getCapabilities();
  }

  /**
   * Get server initialization status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
