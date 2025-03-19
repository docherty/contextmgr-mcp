/**
 * JSON-RPC 2.0 Message Types for MCP Server
 */

export interface BaseMessage {
  jsonrpc: '2.0';
}

export interface RequestMessage extends BaseMessage {
  id: number;
  method: string;
  params?: any;
}

export interface ResponseMessage extends BaseMessage {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface NotificationMessage extends BaseMessage {
  method: string;
  params?: any;
}

export type JSONRPCMessage = RequestMessage | ResponseMessage | NotificationMessage;

// Common message methods
export const Methods = {
  Initialize: 'initialize',
  Shutdown: 'shutdown',
  Exit: 'exit',
  ListTools: 'list_tools',
  CallTool: 'call_tool',
} as const;

// Protocol error codes
export const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ServerNotInitialized: -32002,
  UnknownErrorCode: -32001,
} as const;

// Server information
export interface ServerInfo {
  name: string;
  version: string;
}

// Protocol capabilities
export interface ServerCapabilities {
  tools?: {
    [name: string]: {
      description?: string;
      inputSchema?: any;
    };
  };
  resources?: {
    [name: string]: {
      description?: string;
      schema?: any;
    };
  };
}

// Initialize request/response
export interface InitializeParams {
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
  };
}

export interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: {
    name: string;
    version: string;
  };
}

// Tool execution
export interface CallToolParams {
  name: string;
  arguments: any;
}

export interface CallToolResult {
  content: Array<{
    type: string;
    text: string;
    mime?: string;
  }>;
  isError?: boolean;
}
