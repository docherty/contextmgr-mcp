import type { JSONSchema7 } from 'json-schema';

export interface ContextConfig {
  projectRoot: string;
  contextDir?: string;
  stateFormat?: 'json' | 'sqlite';
  checkpointStrategy?: 'file' | 'db';
}

export interface EntityMetadata {
  name: string;
  createdAt: number;
  description?: string;
  priority?: number;
  filePath?: string;
  taskIds?: string[];
  qaFeedback?: string;
  qaIssues?: Array<{
    description: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  acceptedAt?: number;
  acceptanceComments?: string;
  [key: string]: any;
}

export interface ProjectState {
  id: string;
  currentRole: 'TRIAGE' | 'PLANNING' | 'DEVELOPMENT' | 'QA';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  checkpoint?: string;
  metadata: EntityMetadata;
}

export interface WorkPackageState {
  id: string;
  projectId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  progress: number;
  activeTaskId?: string;
  metadata: EntityMetadata;
}

export interface TaskState {
  id: string;
  workPackageId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'NEEDS_FIX';
  checkpoint?: string;
  changes: FileChange[];
  metadata: EntityMetadata;
}

export interface FileChange {
  path: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: number;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  type: 'PROJECT' | 'TASK';
  parentId: string;
  state: string;
  metadata: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  handler: (input: any) => Promise<any>;
}

export interface VectorEntry {
  id: string;
  entityType: 'PROJECT' | 'WORKPACKAGE' | 'TASK';
  entityId: string;
  vector: number[];
  text: string;
}

export type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
