import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { TaskState, Result } from '../types.js';

export class StartQAReviewTool extends BaseTool {
  name = 'start_qa_review';
  description = 'Start QA review for a task';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to review"
      }
    },
    required: ["taskId"]
  };

  async execute(input: { taskId: string }): Promise<Result<TaskState>> {
    return this.stateManager.updateTaskStatus(input.taskId, 'IN_REVIEW');
  }
}

export class CompleteQAReviewTool extends BaseTool {
  name = 'complete_qa_review';
  description = 'Complete QA review for a task';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task that was reviewed"
      },
      passed: {
        type: "boolean",
        description: "Whether the task passed QA review"
      },
      feedback: {
        type: "string",
        description: "QA feedback"
      }
    },
    required: ["taskId", "passed"]
  };

  async execute(input: {
    taskId: string;
    passed: boolean;
    feedback?: string;
  }): Promise<Result<TaskState>> {
    const taskResult = await this.stateManager.getTask(input.taskId);
    if (!taskResult.success) {
      return taskResult;
    }

    const status = input.passed ? 'COMPLETED' : 'NEEDS_FIX';
    
    // First update the task status
    const updateResult = await this.stateManager.updateTaskStatus(input.taskId, status);
    if (!updateResult.success) {
      return updateResult;
    }

    // If feedback was provided, record it
    if (input.feedback) {
      updateResult.data.metadata.qaFeedback = input.feedback;
      await this.stateManager.saveState();
    }

    return updateResult;
  }
}

export class RequestFixesTool extends BaseTool {
  name = 'request_fixes';
  description = 'Request fixes for a task that failed QA';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task that needs fixes"
      },
      issues: {
        type: "array",
        description: "List of issues that need to be fixed",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Description of the issue"
            },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
              description: "Severity of the issue"
            }
          },
          required: ["description"]
        }
      }
    },
    required: ["taskId", "issues"]
  };

  async execute(input: {
    taskId: string;
    issues: Array<{
      description: string;
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
  }): Promise<Result<TaskState>> {
    const taskResult = await this.stateManager.getTask(input.taskId);
    if (!taskResult.success) {
      return taskResult;
    }

    // Update task status to needs fix
    const updateResult = await this.stateManager.updateTaskStatus(input.taskId, 'NEEDS_FIX');
    if (!updateResult.success) {
      return updateResult;
    }

    // Record the issues that need fixing
    updateResult.data.metadata.qaIssues = input.issues;
    await this.stateManager.saveState();

    return updateResult;
  }
}

export class AcceptWorkPackageTool extends BaseTool {
  name = 'accept_workpackage';
  description = 'Accept a completed work package after QA review';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package to accept"
      },
      comments: {
        type: "string",
        description: "Optional acceptance comments"
      }
    },
    required: ["workPackageId"]
  };

  async execute(input: { workPackageId: string; comments?: string }): Promise<Result<any>> {
    // Get the work package
    const wpResult = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!wpResult.success) {
      return wpResult;
    }

    // Verify all tasks are completed
    const taskIds = wpResult.data.metadata.taskIds || [];
    for (const taskId of taskIds) {
      const taskResult = await this.stateManager.getTask(taskId);
      if (!taskResult.success || taskResult.data.status !== 'COMPLETED') {
        return {
          success: false,
          error: `Not all tasks are completed. Task ${taskId} is in status ${taskResult.success ? taskResult.data.status : 'NOT_FOUND'}`
        };
      }
    }

    // Update work package status and record acceptance
    wpResult.data.status = 'COMPLETED';
    wpResult.data.metadata.acceptedAt = Date.now();
    if (input.comments) {
      wpResult.data.metadata.acceptanceComments = input.comments;
    }

    await this.stateManager.saveState();
    return wpResult;
  }
}
