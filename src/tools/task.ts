import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { Result, TaskState, FileChange } from '../types.js';

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
      filePath: {
        type: "string",
        description: "Primary file associated with the task"
      }
    },
    required: ["workPackageId", "name"]
  };

  async execute(input: { workPackageId: string; name: string; description?: string; filePath?: string }): Promise<Result<TaskState>> {
    return this.stateManager.createTask(input.workPackageId, input.name, {
      description: input.description,
      filePath: input.filePath
    });
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

  async execute(input: { taskId: string; status: TaskState['status'] }): Promise<Result<TaskState>> {
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
      path: {
        type: "string",
        description: "File path"
      },
      type: {
        type: "string",
        description: "Change type",
        enum: ["CREATE", "UPDATE", "DELETE"]
      }
    },
    required: ["taskId", "path", "type"]
  };

  async execute(input: { taskId: string; path: string; type: FileChange['type'] }): Promise<Result<TaskState>> {
    const change: FileChange = {
      path: input.path,
      type: input.type,
      timestamp: Date.now()
    };
    
    return this.stateManager.recordFileChange(input.taskId, change);
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
  description = 'Restore a task checkpoint';
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
