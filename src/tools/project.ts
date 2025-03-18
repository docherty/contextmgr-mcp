import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { ProjectState, Result } from '../types.js';


export class CreateProjectTool extends BaseTool {
  name = 'create_project';
  description = 'Create a new development project';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the project"
      },
      description: {
        type: "string",
        description: "Project description"
      },
      objectives: {
        type: "string",
        description: "Project objectives"
      }
    },
    required: ["name"],
    additionalProperties: true
  };

  async execute(input: { name: string; description?: string; objectives?: string }): Promise<Result<ProjectState>> {
    return this.stateManager.createProject(input.name, {
      description: input.description,
      objectives: input.objectives
    });
  }
}

export class GetProjectTool extends BaseTool {
  name = 'get_project';
  description = 'Get details of a specific project';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the project to retrieve"
      }
    },
    required: ["projectId"]
  };

  async execute(input: { projectId: string }): Promise<Result<ProjectState>> {
    return this.stateManager.getProject(input.projectId);
  }
}

export class CreateProjectCheckpointTool extends BaseTool {
  name = 'create_project_checkpoint';
  description = 'Create a checkpoint for the current project state';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the project to checkpoint"
      },
      description: {
        type: "string",
        description: "Description of the checkpoint"
      }
    },
    required: ["projectId"]
  };

  async execute(input: { projectId: string; description?: string }): Promise<Result<any>> {
    // First verify the project exists
    const projectResult = await this.stateManager.getProject(input.projectId);
    if (!projectResult.success) {
      return projectResult;
    }

    return this.stateManager.createCheckpoint(
      input.projectId,
      'PROJECT',
      {
        description: input.description || 'Project checkpoint',
        timestamp: Date.now()
      }
    );
  }
}

export class RestoreProjectCheckpointTool extends BaseTool {
  name = 'restore_project_checkpoint';
  description = 'Restore project state from a checkpoint';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      checkpointId: {
        type: "string",
        description: "ID of the checkpoint to restore"
      }
    },
    required: ["checkpointId"]
  };

  async execute(input: { checkpointId: string }): Promise<Result<void>> {
    return this.stateManager.restoreCheckpoint(input.checkpointId);
  }
}
