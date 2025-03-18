import { JSONSchema7 } from 'json-schema';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Tool, Result } from '../types.js';
import { StateManager } from '../state/manager.js';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: JSONSchema7;

  constructor(protected stateManager: StateManager) {}

  protected async validateInput(input: any): Promise<void> {
    // Basic schema validation would go here
    // In a full implementation, we'd use a JSON Schema validator
    if (!input || typeof input !== 'object') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid input: expected object'
      );
    }

    // Check required fields from schema
    if (this.inputSchema.required) {
      for (const field of this.inputSchema.required) {
        if (!(field in input)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Missing required field: ${field}`
          );
        }
      }
    }
  }

  abstract execute(input: any): Promise<Result<any>>;

  async handler(input: any): Promise<Result<any>> {
    try {
      await this.validateInput(input);
      return this.execute(input);
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
