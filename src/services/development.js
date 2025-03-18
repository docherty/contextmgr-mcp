const Project = require('../db/models/Project');
const WorkPackage = require('../db/models/WorkPackage');
const Task = require('../db/models/Task');
const FileRegistry = require('../db/models/FileRegistry');
const ProjectState = require('../db/models/ProjectState');
const orchestratorService = require('./orchestrator');

class DevelopmentService {
  /**
   * Start working on a task
   * @param {String} taskId - Task ID
   * @returns {Object} Updated task and project state
   */
  async startTask(taskId) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Check if task is in PLANNED state
    if (task.status !== 'PLANNED' && task.status !== 'FAILED') {
      throw new Error(`Task is already in ${task.status} state`);
    }
    
    // Check if all dependencies are completed
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyTasks = await Task.findAll({
        where: { taskId: task.dependencies }
      });
      
      const incompleteDeps = dependencyTasks.filter(dt => dt.status !== 'COMPLETED');
      if (incompleteDeps.length > 0) {
        throw new Error(`Cannot start task: ${incompleteDeps.length} dependencies are not completed`);
      }
    }
    
    // Update task status
    task.status = 'IN_PROGRESS';
    await task.save();
    
    // Update work package status if it's the first task
    const workPackage = task.WorkPackage;
    if (workPackage.status === 'PLANNED') {
      workPackage.status = 'IN_PROGRESS';
      await workPackage.save();
    }
    
    // Create or update file registry entry
    let fileRecord = await FileRegistry.findOne({
      where: {
        projectId: workPackage.Project.id,
        filePath: task.filePath
      }
    });
    
    if (!fileRecord) {
      fileRecord = await FileRegistry.create({
        projectId: workPackage.Project.id,
        filePath: task.filePath,
        modificationHistory: [],
        lastModifiedBy: task.id
      });
    }
    
    // Update project state
    const projectId = workPackage.Project.id;
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    const updatedState = {
      ...currentState,
      activeTask: {
        id: task.id,
        taskId: task.taskId,
        name: task.name,
        filePath: task.filePath
      }
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    return { task, state: updatedState };
  }
  
  /**
   * Complete a development task and mark ready for QA
   * @param {String} taskId - Task ID
   * @param {Object} implementationData - Implementation details
   * @returns {Object} Updated task and project state
   */
  async completeTask(taskId, implementationData) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Ensure task is in progress
    if (task.status !== 'IN_PROGRESS') {
      throw new Error(`Task must be IN_PROGRESS to complete. Current status: ${task.status}`);
    }
    
    // Update task with implementation details
    task.changes = implementationData.changes || task.changes;
    task.status = 'READY_FOR_QA';
    await task.save();
    
    // Update file registry
    const fileRecord = await FileRegistry.findOne({
      where: {
        projectId: task.WorkPackage.Project.id,
        filePath: task.filePath
      }
    });
    
    if (fileRecord) {
      const modHistory = fileRecord.modificationHistory || [];
      modHistory.push({
        taskId: task.taskId,
        timestamp: new Date().toISOString(),
        changes: implementationData.changes
      });
      
      fileRecord.modificationHistory = modHistory;
      fileRecord.currentState = implementationData.fileState || fileRecord.currentState;
      fileRecord.lastModifiedBy = task.id;
      await fileRecord.save();
    }
    
    // Update project state
    const projectId = task.WorkPackage.Project.id;
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    // Find other tasks pending QA
    const pendingQaTasks = await Task.findAll({
      where: { status: 'READY_FOR_QA' },
      include: [{ 
        model: WorkPackage, 
        where: { projectId }
      }]
    });
    
    const updatedState = {
      ...currentState,
      activeTask: null,
      pendingQA: pendingQaTasks.map(t => ({
        id: t.id,
        taskId: t.taskId,
        name: t.name
      }))
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    // If we have pending QA tasks, transition to QA role
    if (pendingQaTasks.length === 1) { // First task ready for QA
      return orchestratorService.transitionRole(projectId, 'QA', {
        message: 'Task ready for QA review',
        pendingQA: pendingQaTasks.map(t => t.taskId)
      });
    }
    
    return { task, state: updatedState };
  }
  
  /**
   * Get the next task to work on
   * @param {String} projectId - Project ID
   * @returns {Object} Next task information or null if none
   */
  async getNextTask(projectId) {
    // Use orchestrator service to get next pending task
    const nextTask = await orchestratorService.getNextPendingTask(projectId);
    
    if (!nextTask) {
      const project = await Project.findByPk(projectId);
      
      // Check if all tasks are completed or in QA
      const allTasks = await Task.findAll({
        include: [{ 
          model: WorkPackage, 
          where: { projectId }
        }]
      });
      
      const allTasksComplete = allTasks.every(
        t => t.status === 'COMPLETED' || t.status === 'READY_FOR_QA' || t.status === 'QA_IN_PROGRESS'
      );
      
      if (allTasksComplete) {
        // All tasks are either complete or in QA
        return {
          message: 'All tasks are either completed or in QA',
          nextStep: 'Wait for QA completion'
        };
      }
      
      // Some tasks might be blocked by dependencies
      return {
        message: 'No available tasks to work on. Some tasks might be blocked by dependencies.',
        blockedTasks: allTasks
          .filter(t => t.status === 'PLANNED' && t.dependencies.length > 0)
          .map(t => t.taskId)
      };
    }
    
    return {
      task: nextTask,
      message: `Ready to start task ${nextTask.taskId}: ${nextTask.name}`
    };
  }
  
  /**
   * Record implementation checkpoint 
   * @param {String} taskId - Task ID
   * @param {Object} checkpointData - Current implementation state
   * @returns {Object} Updated project state
   */
  async saveImplementationCheckpoint(taskId, checkpointData) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Ensure task is in progress
    if (task.status !== 'IN_PROGRESS') {
      throw new Error(`Task must be IN_PROGRESS to save checkpoint. Current status: ${task.status}`);
    }
    
    const projectId = task.WorkPackage.Project.id;
    
    // Update file registry with current state
    if (checkpointData.fileState) {
      let fileRecord = await FileRegistry.findOne({
        where: {
          projectId,
          filePath: task.filePath
        }
      });
      
      if (fileRecord) {
        fileRecord.currentState = checkpointData.fileState;
        await fileRecord.save();
      }
    }
    
    // Create checkpoint state
    const checkpointState = await orchestratorService.saveCheckpoint(
      projectId, 
      {
        taskId: task.taskId,
        implementationState: checkpointData
      }
    );
    
    return checkpointState;
  }
  
  /**
   * Resume work on a task after interruption
   * @param {String} taskId - Task ID
   * @returns {Object} Task context with file state
   */
  async resumeTask(taskId) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Get file state from registry
    const fileRecord = await FileRegistry.findOne({
      where: {
        projectId: task.WorkPackage.Project.id,
        filePath: task.filePath
      }
    });
    
    // Get latest checkpoint for this task
    const projectId = task.WorkPackage.Project.id;
    const latestState = await ProjectState.findOne({
      where: { 
        projectId,
        checkpoint: true
      },
      order: [['timestamp', 'DESC']]
    });
    
    // Extract task-specific context from checkpoint if available
    let implementationContext = {};
    
    if (latestState && latestState.state.checkpoint && 
        latestState.state.checkpoint.data.taskId === task.taskId) {
      implementationContext = latestState.state.checkpoint.data.implementationState || {};
    }
    
    return {
      task,
      fileState: fileRecord ? fileRecord.currentState : {},
      fileHistory: fileRecord ? fileRecord.modificationHistory : [],
      implementationContext,
      workPackage: task.WorkPackage
    };
  }
}

module.exports = new DevelopmentService();