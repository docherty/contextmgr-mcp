import {
  ServerCapabilities,
  CallToolParams,
  CallToolResult,
  ErrorCodes
} from './protocol-types.js';
import { McpProtocolError } from './base-server.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: any;
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {}

  /**
   * Register a new tool with the registry
   */
  public registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Get the capabilities object for all registered tools
   */
  public getCapabilities(): ServerCapabilities {
    const tools: ServerCapabilities['tools'] = {};

    for (const [name, tool] of this.tools.entries()) {
      tools[name] = {
        description: tool.description,
        inputSchema: tool.inputSchema
      };
    }

    return { tools };
  }

  /**
   * Execute a tool by name with the provided arguments
   */
  public async executeTool(params: CallToolParams): Promise<CallToolResult> {
    const tool = this.tools.get(params.name);
    if (!tool) {
      throw new McpProtocolError(
        ErrorCodes.MethodNotFound,
        `Tool '${params.name}' not found`
      );
    }

    try {
      // Validate input if schema is provided
      if (tool.inputSchema) {
        this.validateInput(params.arguments, tool.inputSchema);
      }

      // Execute the tool
      const result = await tool.execute(params.arguments);

      // Format the result
      return this.formatResult(result);
    } catch (error) {
      if (error instanceof McpProtocolError) {
        throw error;
      }

      throw new McpProtocolError(
        ErrorCodes.InternalError,
        error instanceof Error ? error.message : 'Tool execution failed'
      );
    }
  }

  /**
   * Validate tool input against its schema
   */
  private validateInput(input: any, schema: any): void {
    // Basic schema validation
    // In a production environment, you would use a proper JSON Schema validator
    if (schema.type === 'object' && typeof input !== 'object') {
      throw new McpProtocolError(
        ErrorCodes.InvalidParams,
        'Input must be an object'
      );
    }

    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in input)) {
          throw new McpProtocolError(
            ErrorCodes.InvalidParams,
            `Missing required parameter: ${required}`
          );
        }
      }
    }
  }

  /**
   * Format tool execution result into standard response format
   */
  private formatResult(result: any): CallToolResult {
    // If result is already in CallToolResult format, return as is
    if (
      typeof result === 'object' &&
      result !== null &&
      Array.isArray(result.content)
    ) {
      return result;
    }

    // Convert simple result to standard format
    let content = result;
    if (typeof result !== 'string') {
      content = JSON.stringify(result, null, 2);
    }

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  /**
   * Check if a tool exists
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a tool definition by name
   */
  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Remove a tool from the registry
   */
  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all registered tools
   */
  public clear(): void {
    this.tools.clear();
  }
}
