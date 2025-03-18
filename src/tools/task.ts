import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { TaskState, Result, FileChange } from '../types.js';

export class CreateTaskTool extends BaseTool {
  name = 'create_task';
  description = 'Create a new task in a work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package"
      },
      name: {
        type: "string",
        description: "Name of the task"
      },
      description: {
        type: "string",
        description: "Task description"
      },
      priority: {
        type: "number",
        description: "Priority level (1-5)",
        minimum: 1,
        maximum: 5
      },
      filePath: {
        type: "string",
        description: "Path to the file this task will modify"
      }
    },
    required: ["workPackageId", "name"]
  };

  async execute(input: {
    workPackageId: string;
    name: string;
    description?: string;
    priority?: number;
    filePath?: string;
  }): Promise<Result<TaskState>> {
    const metadata = {
      name: input.name,
      description: input.description,
      priority: input.priority || 3,
      filePath: input.filePath
    };

    return this.stateManager.createTask(
      input.workPackageId,
      input.name,
      {
        description: input.description,
        priority: input.priority || 3,
        filePath: input.filePath
      }
    );
  }
}

export class UpdateTaskStatusTool extends BaseTool {
  name = 'update_task_status';
  description = 'Update the status of a task';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task"
      },
      status: {
        type: "string",
        description: "New status",
        enum: ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "NEEDS_FIX"]
      }
    },
    required: ["taskId", "status"]
  };

  async execute(input: {
    taskId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'NEEDS_FIX';
  }): Promise<Result<TaskState>> {
    return this.stateManager.updateTaskStatus(input.taskId, input.status);
  }
}

export class RecordFileChangeTool extends BaseTool {
  name = 'record_file_change';
  description = 'Record a file change for a task';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task"
      },
      filePath: {
        type: "string",
        description: "Path to the changed file"
      },
      changeType: {
        type: "string",
        description: "Type of change",
        enum: ["CREATE", "UPDATE", "DELETE"]
      }
    },
    required: ["taskId", "filePath", "changeType"]
  };

  async execute(input: {
    taskId: string;
    filePath: string;
    changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  }): Promise<Result<TaskState>> {
    return this.stateManager.recordFileChange(input.taskId, {
      path: input.filePath,
      type: input.changeType,
      timestamp: Date.now()
    });
  }
}

export class CreateTaskCheckpointTool extends BaseTool {
  name = 'create_task_checkpoint';
  description = 'Create a checkpoint for a task';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task"
      },
      description: {
        type: "string",
        description: "Description of the checkpoint"
      }
    },
    required: ["taskId"]
  };

  async execute(input: { taskId: string; description?: string }): Promise<Result<any>> {
    const taskResult = await this.stateManager.getTask(input.taskId);
    if (!taskResult.success) {
      return taskResult;
    }

    return this.stateManager.createCheckpoint(
      input.taskId,
      'TASK',
      {
        description: input.description || 'Task checkpoint',
        timestamp: Date.now()
      }
    );
  }
}

export class RestoreTaskCheckpointTool extends BaseTool {
  name = 'restore_task_checkpoint';
  description = 'Restore a task from a checkpoint';
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
