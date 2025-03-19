import type { JSONSchema7 } from 'json-schema';
import { BaseTool } from './base.js';
import { Result, WorkPackageState, TaskState } from '../types.js';

export class StartQAReviewTool extends BaseTool {
  name = 'start_qa_review';
  description = 'Start QA review for a work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package to review"
      }
    },
    required: ["workPackageId"]
  };

  async execute(input: { workPackageId: string }): Promise<Result<WorkPackageState>> {
    const result = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!result.success) {
      return result;
    }

    const workPackage = result.data;
    workPackage.status = 'IN_REVIEW';
    await this.stateManager.saveState();
    
    return { success: true, data: workPackage };
  }
}

export class CompleteQAReviewTool extends BaseTool {
  name = 'complete_qa_review';
  description = 'Complete QA review for a work package';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package"
      },
      feedback: {
        type: "string",
        description: "QA feedback"
      },
      issues: {
        type: "array",
        description: "List of issues found",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Issue description"
            },
            severity: {
              type: "string",
              description: "Issue severity",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            }
          },
          required: ["description"]
        }
      }
    },
    required: ["workPackageId", "feedback"]
  };

  async execute(input: { 
    workPackageId: string; 
    feedback: string; 
    issues?: Array<{ description: string; severity?: string }>
  }): Promise<Result<WorkPackageState>> {
    const result = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!result.success) {
      return result;
    }

    const workPackage = result.data;
    workPackage.metadata.qaFeedback = input.feedback;
    
    if (input.issues) {
      workPackage.metadata.qaIssues = input.issues.map(issue => ({
        description: issue.description,
        severity: (issue.severity as any) || 'MEDIUM'
      }));
    }
    
    await this.stateManager.saveState();
    
    return { success: true, data: workPackage };
  }
}

export class RequestFixesTool extends BaseTool {
  name = 'request_fixes';
  description = 'Request fixes for a task based on QA issues';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task"
      },
      issues: {
        type: "array",
        description: "List of issues to fix",
        items: {
          type: "string",
          description: "Issue description"
        }
      }
    },
    required: ["taskId"]
  };

  async execute(input: { 
    taskId: string; 
    issues?: string[] 
  }): Promise<Result<TaskState>> {
    const result = await this.stateManager.getTask(input.taskId);
    if (!result.success) {
      return result;
    }

    const task = result.data;
    task.status = 'NEEDS_FIX';
    
    if (input.issues && input.issues.length > 0) {
      task.metadata.fixIssues = input.issues;
    }
    
    await this.stateManager.saveState();
    
    return { success: true, data: task };
  }
}

export class AcceptWorkPackageTool extends BaseTool {
  name = 'accept_workpackage';
  description = 'Accept a work package as complete';
  inputSchema: JSONSchema7 = {
    type: "object",
    properties: {
      workPackageId: {
        type: "string",
        description: "ID of the work package"
      },
      comments: {
        type: "string",
        description: "Acceptance comments"
      }
    },
    required: ["workPackageId"]
  };

  async execute(input: { 
    workPackageId: string; 
    comments?: string 
  }): Promise<Result<WorkPackageState>> {
    const result = await this.stateManager.getWorkPackage(input.workPackageId);
    if (!result.success) {
      return result;
    }

    const workPackage = result.data;
    workPackage.status = 'COMPLETED';
    workPackage.metadata.acceptedAt = Date.now();
    
    if (input.comments) {
      workPackage.metadata.acceptanceComments = input.comments;
    }
    
    await this.stateManager.saveState();
    
    return { success: true, data: workPackage };
  }
}
