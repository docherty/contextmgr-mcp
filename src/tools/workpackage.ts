import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { WorkPackageState, Result } from '../types.js';

export class CreateWorkPackageTool extends BaseTool {
  name = 'create_workpackage';
  description = 'Create a new work package in a project';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the project"
      },
      name: {
        type: "string",
        description: "Name of the work package"
      },
      description: {
        type: "string",
        description: "Work package description"
      },
      priority: {
        type: "number",
        description: "Priority level (1-5)",
        minimum: 1,
        maximum: 5
      }
    },
    required: ["projectId", "name"]
  };

  async execute(input: {
    projectId: string;
    name: string;
    description?: string;
    priority?: number;
  }): Promise<Result<WorkPackageState>> {
    return this.stateManager.createWorkPackage(
      input.projectId,
      input.name,
      {
        description: input.description,
        priority: input.priority || 3
      }
    );
  }
}

export class GetWorkPackageTool extends BaseTool {
  name = 'get_workpackage';
  description = 'Get details of a specific work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package to retrieve"
      }
    },
    required: ["workPackageId"]
  };

  async execute(input: { workPackageId: string }): Promise<Result<WorkPackageState>> {
    return this.stateManager.getWorkPackage(input.workPackageId);
  }
}

export class UpdateWorkPackageProgressTool extends BaseTool {
  name = 'update_workpackage_progress';
  description = 'Update the progress of a work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package"
      },
      progress: {
        type: "number",
        description: "Progress percentage (0-100)",
        minimum: 0,
        maximum: 100
      }
    },
    required: ["workPackageId", "progress"]
  };

  async execute(input: { workPackageId: string; progress: number }): Promise<Result<WorkPackageState>> {
    const wpResult = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!wpResult.success) {
      return wpResult;
    }

    const wp = wpResult.data;
    wp.progress = input.progress;
    if (input.progress === 100) {
      wp.status = 'COMPLETED';
    } else if (input.progress > 0) {
      wp.status = 'IN_PROGRESS';
    }

    await this.stateManager.saveState();
    return { success: true, data: wp };
  }
}

export class UpdateWorkPackageStatusTool extends BaseTool {
  name = 'update_workpackage_status';
  description = 'Update the status of a work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package"
      },
      status: {
        type: "string",
        description: "New status",
        enum: ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"]
      }
    },
    required: ["workPackageId", "status"]
  };

  async execute(input: {
    workPackageId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  }): Promise<Result<WorkPackageState>> {
    const wpResult = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!wpResult.success) {
      return wpResult;
    }

    const wp = wpResult.data;
    wp.status = input.status;
    if (input.status === 'COMPLETED') {
      wp.progress = 100;
    } else if (input.status === 'PENDING') {
      wp.progress = 0;
    }

    await this.stateManager.saveState();
    return { success: true, data: wp };
  }
}
