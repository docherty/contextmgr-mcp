import { Tool } from './types.js';
import { StateManager } from './state/manager.js';

export interface ContextConfig {
  projectRoot: string;
  contextDir?: string;
  stateFormat?: 'json' | 'sqlite';
  checkpointStrategy?: 'file' | 'db';
}

export declare class ContextmgrServer {
  constructor(config: ContextConfig);
  public initialize(): Promise<void>;
  public start(): Promise<void>;
}

// Re-export types
export * from './types.js';

// Re-export tools
export { BaseTool } from './tools/base.js';
export {
  CreateProjectTool,
  GetProjectTool,
  CreateProjectCheckpointTool,
  RestoreProjectCheckpointTool
} from './tools/project.js';
export {
  CreateWorkPackageTool,
  GetWorkPackageTool,
  UpdateWorkPackageProgressTool,
  UpdateWorkPackageStatusTool
} from './tools/workpackage.js';
export {
  CreateTaskTool,
  UpdateTaskStatusTool,
  RecordFileChangeTool,
  CreateTaskCheckpointTool,
  RestoreTaskCheckpointTool
} from './tools/task.js';
export {
  StartQAReviewTool,
  CompleteQAReviewTool,
  RequestFixesTool,
  AcceptWorkPackageTool
} from './tools/qa.js';
