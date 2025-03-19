import { EventEmitter } from 'events';
import { Transport } from '../transport/socket-transport.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  JSONRPCMessage,
  RequestMessage,
  ResponseMessage,
  NotificationMessage,
  ServerCapabilities,
  ErrorCodes
} from './protocol-types.js';

// Type guard functions
function hasMethod(obj: any): obj is { method: string } {
  return typeof obj === 'object' && obj !== null && typeof obj.method === 'string';
}

function hasId(obj: any): obj is { id: number } {
  return typeof obj === 'object' && obj !== null && typeof obj.id === 'number';
}

export interface ServerInfo {
  name: string;
  version: string;
}

export class McpProtocolError extends McpError {
  constructor(code: number, message: string, data?: any) {
    super(code, message, data);
    this.name = 'McpProtocolError';
  }
}

export interface RequestHandler<T = any, R = any> {
  (request: { method: string; params: T }): Promise<R>;
}

export class BaseServer extends EventEmitter {
  private transport: Transport | null = null;
  private nextMessageId: number = 1;
  private requestHandlers: Map<string, RequestHandler> = new Map();
  private pendingRequests: Map<number, { 
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();

  constructor(
    private serverInfo: ServerInfo,
    private capabilities: ServerCapabilities = {}
  ) {
    super();
    this.handleMessage = this.handleMessage.bind(this);
  }

  public setRequestHandler<T = any, R = any>(
    method: string,
    handler: RequestHandler<T, R>
  ): void {
    this.requestHandlers.set(method, handler);
  }

  public async connect(transport: Transport): Promise<void> {
    this.transport = transport;
    transport.onmessage = this.handleMessage;
  }

  private async handleMessage(message: JSONRPCMessage): Promise<void> {
    try {
      // Validate JSON-RPC version
      if (message.jsonrpc !== '2.0') {
        throw new McpProtocolError(
          ErrorCodes.InvalidRequest,
          'Invalid JSON-RPC version'
        );
      }

      if (this.isRequestMessage(message)) {
        await this.handleRequest(message);
      } else if (this.isResponseMessage(message)) {
        this.handleResponse(message);
      } else if (this.isNotificationMessage(message)) {
        await this.handleNotification(message);
      } else {
        throw new McpProtocolError(
          ErrorCodes.InvalidRequest,
          'Invalid message format'
        );
      }
    } catch (error) {
      if (error instanceof McpProtocolError) {
        // Protocol errors are already properly formatted
        this.emit('error', error);
      } else {
        // Wrap other errors as internal errors
        this.emit(
          'error',
          new McpProtocolError(
            ErrorCodes.InternalError,
            error instanceof Error ? error.message : 'Unknown error'
          )
        );
      }
    }
  }

  private isRequestMessage(message: any): message is RequestMessage {
    return (
      message.jsonrpc === '2.0' &&
      hasId(message) &&
      hasMethod(message)
    );
  }

  private isResponseMessage(message: any): message is ResponseMessage {
    return (
      message.jsonrpc === '2.0' &&
      hasId(message) &&
      (message.hasOwnProperty('result') || message.hasOwnProperty('error'))
    );
  }

  private isNotificationMessage(
    message: any
  ): message is NotificationMessage {
    return (
      message.jsonrpc === '2.0' &&
      !hasId(message) &&
      hasMethod(message)
    );
  }

  private async handleRequest(message: RequestMessage): Promise<void> {
    const handler = this.requestHandlers.get(message.method);
    
    if (!handler) {
      this.sendErrorResponse(message.id, {
        code: ErrorCodes.MethodNotFound,
        message: `Method not found: ${message.method}`
      });
      return;
    }

    try {
      const result = await handler({
        method: message.method,
        params: message.params
      });
      this.sendResponse(message.id, result);
    } catch (error) {
      if (error instanceof McpProtocolError) {
        this.sendErrorResponse(message.id, {
          code: error.code,
          message: error.message,
          data: error.data
        });
      } else {
        this.sendErrorResponse(message.id, {
          code: ErrorCodes.InternalError,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private handleResponse(message: ResponseMessage): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(message.id);

    if ('error' in message && message.error) {
      pending.reject(
        new McpProtocolError(message.error.code, message.error.message, message.error.data)
      );
    } else {
      pending.resolve(message.result);
    }
  }

  private async handleNotification(message: NotificationMessage): Promise<void> {
    const handler = this.requestHandlers.get(message.method);
    if (handler) {
      try {
        await handler({
          method: message.method,
          params: message.params
        });
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  protected async sendRequest<T = any>(
    method: string,
    params?: any
  ): Promise<T> {
    if (!this.transport) {
      throw new Error('Transport not connected');
    }

    const id = this.nextMessageId++;
    const request: RequestMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.transport!.send(request);
    });
  }

  private sendResponse(id: number, result: any): void {
    if (!this.transport) {
      return;
    }

    const response: ResponseMessage = {
      jsonrpc: '2.0',
      id,
      result
    };

    this.transport.send(response);
  }

  private sendErrorResponse(
    id: number,
    error: { code: number; message: string; data?: any }
  ): void {
    if (!this.transport) {
      return;
    }

    const response: ResponseMessage = {
      jsonrpc: '2.0',
      id,
      error
    };

    this.transport.send(response);
  }

  protected sendNotification(method: string, params?: any): void {
    if (!this.transport) {
      return;
    }

    const notification: NotificationMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

    this.transport.send(notification);
  }

  public async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
