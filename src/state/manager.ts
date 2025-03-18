import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ProjectState,
  WorkPackageState,
  TaskState,
  Checkpoint,
  Result,
  FileChange
} from '../types.js';

interface StateData {
  projects: Map<string, ProjectState>;
  workPackages: Map<string, WorkPackageState>;
  tasks: Map<string, TaskState>;
  checkpoints: Map<string, Checkpoint>;
}

export class StateManager {
  private contextDir: string;
  private state: StateData;

  constructor(contextDir: string) {
    this.contextDir = contextDir;
    this.state = {
      projects: new Map(),
      workPackages: new Map(),
      tasks: new Map(),
      checkpoints: new Map()
    };
  }

  private async loadState(): Promise<void> {
    try {
      const statePath = path.join(this.contextDir, 'state.json');
      const data = await readFile(statePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Convert arrays back to Maps
      this.state = {
        projects: new Map(Object.entries(parsed.projects || {})),
        workPackages: new Map(Object.entries(parsed.workPackages || {})),
        tasks: new Map(Object.entries(parsed.tasks || {})),
        checkpoints: new Map(Object.entries(parsed.checkpoints || {}))
      };
    } catch (error) {
      // If file doesn't exist, use empty state
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  public async saveState(): Promise<void> {
    const statePath = path.join(this.contextDir, 'state.json');
    const data = {
      projects: Object.fromEntries(this.state.projects),
      workPackages: Object.fromEntries(this.state.workPackages),
      tasks: Object.fromEntries(this.state.tasks),
      checkpoints: Object.fromEntries(this.state.checkpoints)
    };
    await writeFile(statePath, JSON.stringify(data, null, 2));
  }

  async initialize(): Promise<void> {
    await this.loadState();
  }

  public getWorkPackage(id: string): Promise<Result<WorkPackageState>> {
    const workPackage = this.state.workPackages.get(id);
    if (!workPackage) {
      return Promise.resolve({
        success: false,
        error: `Work package not found: ${id}`
      });
    }
    return Promise.resolve({ success: true, data: workPackage });
  }

  public async getTask(id: string): Promise<Result<TaskState>> {
    const task = this.state.tasks.get(id);
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${id}`
      };
    }
    return { success: true, data: task };
  }

  public async createTask(
    workPackageId: string,
    name: string,
    metadata: Record<string, any>
  ): Promise<Result<TaskState>> {
    const wp = this.state.workPackages.get(workPackageId);
    if (!wp) {
      return {
        success: false,
        error: `Work package not found: ${workPackageId}`
      };
    }

    const task: TaskState = {
      id: uuidv4(),
      workPackageId,
      status: 'PENDING',
      changes: [],
      metadata: {
        name,
        createdAt: Date.now(),
        ...metadata
      }
    };

    this.state.tasks.set(task.id, task);
    await this.saveState();
    
    return { success: true, data: task };
  }

  public async updateTaskStatus(
    taskId: string,
    status: TaskState['status']
  ): Promise<Result<TaskState>> {
    const task = this.state.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${taskId}`
      };
    }

    task.status = status;
    await this.saveState();
    
    return { success: true, data: task };
  }

  public async recordFileChange(
    taskId: string,
    change: FileChange
  ): Promise<Result<TaskState>> {
    const task = this.state.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${taskId}`
      };
    }

    task.changes.push(change);
    await this.saveState();
    
    return { success: true, data: task };
  }

  async createProject(name: string, metadata: Record<string, any>): Promise<Result<ProjectState>> {
    const project: ProjectState = {
      id: uuidv4(),
      currentRole: 'TRIAGE',
      status: 'ACTIVE',
      metadata: {
        name,
        ...metadata,
        createdAt: Date.now()
      }
    };

    this.state.projects.set(project.id, project);
    await this.saveState();

    return { success: true, data: project };
  }

  async getProject(id: string): Promise<Result<ProjectState>> {
    const project = this.state.projects.get(id);
    if (!project) {
      return {
        success: false,
        error: `Project not found: ${id}`
      };
    }
    return { success: true, data: project };
  }

  async createWorkPackage(
    projectId: string,
    name: string,
    metadata: Record<string, any>
  ): Promise<Result<WorkPackageState>> {
    const project = this.state.projects.get(projectId);
    if (!project) {
      return {
        success: false,
        error: `Project not found: ${projectId}`
      };
    }

    const workPackage: WorkPackageState = {
      id: uuidv4(),
      projectId,
      status: 'PENDING',
      progress: 0,
      metadata: {
        name,
        ...metadata,
        createdAt: Date.now()
      }
    };

    this.state.workPackages.set(workPackage.id, workPackage);
    await this.saveState();

    return { success: true, data: workPackage };
  }

  async createCheckpoint(
    parentId: string,
    type: 'PROJECT' | 'TASK',
    metadata: Record<string, any>
  ): Promise<Result<Checkpoint>> {
    const checkpoint: Checkpoint = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      parentId,
      state: JSON.stringify(this.state),
      metadata
    };

    this.state.checkpoints.set(checkpoint.id, checkpoint);
    
    // Save checkpoint to file
    const checkpointPath = path.join(
      this.contextDir,
      'checkpoints',
      `${checkpoint.id}.json`
    );
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));

    await this.saveState();

    return { success: true, data: checkpoint };
  }

  async restoreCheckpoint(checkpointId: string): Promise<Result<void>> {
    const checkpoint = this.state.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return {
        success: false,
        error: `Checkpoint not found: ${checkpointId}`
      };
    }

    try {
      const restoredState = JSON.parse(checkpoint.state);
      this.state = {
        projects: new Map(Object.entries(restoredState.projects || {})),
        workPackages: new Map(Object.entries(restoredState.workPackages || {})),
        tasks: new Map(Object.entries(restoredState.tasks || {})),
        checkpoints: this.state.checkpoints // Keep existing checkpoints
      };

      await this.saveState();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Failed to restore checkpoint: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
