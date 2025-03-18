const Project = require('../db/models/Project');
const WorkPackage = require('../db/models/WorkPackage');
const Task = require('../db/models/Task');
const FileRegistry = require('../db/models/FileRegistry');
const ProjectState = require('../db/models/ProjectState');
const orchestratorService = require('./orchestrator');
const planningService = require('./planning');

class QAService {
  /**
   * Start QA review for a task
   * @param {String} taskId - Task ID
   * @returns {Object} Task with context for QA
   */
  async startTaskReview(taskId) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Ensure task is ready for QA
    if (task.status !== 'READY_FOR_QA') {
      throw new Error(`Task must be READY_FOR_QA to review. Current status: ${task.status}`);
    }
    
    // Update task status
    task.status = 'QA_IN_PROGRESS';
    await task.save();
    
    // Get file state from registry
    const fileRecord = await FileRegistry.findOne({
      where: {
        projectId: task.WorkPackage.Project.id,
        filePath: task.filePath
      }
    });
    
    // Update project state
    const projectId = task.WorkPackage.Project.id;
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    const updatedState = {
      ...currentState,
      activeQA: {
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
    
    return {
      task,
      fileState: fileRecord ? fileRecord.currentState : {},
      fileHistory: fileRecord ? fileRecord.modificationHistory : [],
      workPackage: task.WorkPackage
    };
  }
  
  /**
   * Complete QA review for a task
   * @param {String} taskId - Task ID
   * @param {Object} qaResults - QA results and feedback
   * @returns {Object} Updated task and project state
   */
  async completeTaskReview(taskId, qaResults) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Ensure task is in QA
    if (task.status !== 'QA_IN_PROGRESS') {
      throw new Error(`Task must be QA_IN_PROGRESS to complete review. Current status: ${task.status}`);
    }
    
    const projectId = task.WorkPackage.Project.id;
    
    // Update task based on QA result
    if (qaResults.passed) {
      task.status = 'COMPLETED';
      task.qaResults = qaResults;
      await task.save();
      
      // Update work package progress
      await orchestratorService.updateWorkPackageProgress(task.workPackageId);
      
      // Check if all tasks in the work package are complete
      const workPackage = task.WorkPackage;
      const allTasksInWP = await Task.findAll({ where: { workPackageId: workPackage.id } });
      const allComplete = allTasksInWP.every(t => t.status === 'COMPLETED');
      
      if (allComplete) {
        workPackage.status = 'COMPLETED';
        await workPackage.save();
      }
    } else {
      // Task failed QA, mark as failed
      task.status = 'FAILED';
      task.qaResults = qaResults;
      await task.save();
      
      // If QA specified fixes, create a new task for them
      if (qaResults.requiredFixes && qaResults.requiredFixes.length > 0) {
        // Create a fix task
        const fixTask = await planningService.createTask(task.workPackageId, {
          name: `Fix issues in ${task.name}`,
          description: `Fix the following issues:\n${qaResults.requiredFixes.join('\n')}`,
          filePath: task.filePath,
          priority: task.priority - 1, // Higher priority than original task
          dependencies: [task.taskId],
          successCriteria: qaResults.successCriteria || task.successCriteria
        });
      }
    }
    
    // Update project state
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    // Get remaining tasks for QA
    const pendingQaTasks = await Task.findAll({
      where: { status: 'READY_FOR_QA' },
      include: [{ 
        model: WorkPackage, 
        where: { projectId }
      }]
    });
    
    const updatedState = {
      ...currentState,
      activeQA: null,
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
    
    // If no more tasks pending QA, check if we should transition back to development
    if (pendingQaTasks.length === 0) {
      // Check if all tasks are completed
      const allTasks = await Task.findAll({
        include: [{ 
          model: WorkPackage, 
          where: { projectId }
        }]
      });
      
      const allComplete = allTasks.every(t => t.status === 'COMPLETED');
      
      if (allComplete) {
        // All tasks are complete, project is done
        const project = await Project.findByPk(projectId);
        project.status = 'COMPLETED';
        await project.save();
        
        return orchestratorService.transitionRole(projectId, 'ORCHESTRATOR', {
          message: 'Project completed successfully',
          finalStatus: 'COMPLETED'
        });
      } else {
        // Some tasks still need work, transition back to development
        return orchestratorService.transitionRole(projectId, 'DEVELOPMENT', {
          message: 'QA complete for current tasks, continuing development',
          nextTask: await orchestratorService.getNextPendingTask(projectId)
        });
      }
    }
    
    return { task, state: updatedState };
  }
  
  /**
   * Get tasks ready for QA review
   * @param {String} projectId - Project ID
   * @returns {Array} List of tasks ready for QA
   */
  async getTasksReadyForQA(projectId) {
    const pendingQaTasks = await Task.findAll({
      where: { status: 'READY_FOR_QA' },
      include: [{ 
        model: WorkPackage, 
        where: { projectId }
      }],
      order: [['createdAt', 'ASC']]
    });
    
    return pendingQaTasks;
  }
  
  /**
   * Create a fix task for failed QA
   * @param {String} taskId - Failed task ID
   * @param {Object} fixDetails - Details of required fixes
   * @returns {Object} Created fix task
   */
  async createFixTask(taskId, fixDetails) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (task.status !== 'FAILED') {
      throw new Error('Can only create fix tasks for failed tasks');
    }
    
    // Create a fix task
    const fixTask = await planningService.createTask(task.workPackageId, {
      name: fixDetails.name || `Fix issues in ${task.name}`,
      description: fixDetails.description || 'Fix issues identified during QA',
      filePath: task.filePath,
      priority: task.priority - 1, // Higher priority than original task
      dependencies: [task.taskId],
      successCriteria: fixDetails.successCriteria || 'All issues from failed QA are resolved'
    });
    
    return fixTask;
  }
  
  /**
   * Perform a work package quality review
   * @param {String} workPackageId - Work package ID
   * @returns {Object} QA results for the work package
   */
  async reviewWorkPackage(workPackageId) {
    const workPackage = await WorkPackage.findByPk(workPackageId, {
      include: [Project]
    });
    
    if (!workPackage) {
      throw new Error('Work package not found');
    }
    
    // Get all tasks in the work package
    const tasks = await Task.findAll({ 
      where: { workPackageId },
      order: [['createdAt', 'ASC']]
    });
    
    // Check if all tasks are completed
    const incomplete = tasks.filter(t => t.status !== 'COMPLETED');
    if (incomplete.length > 0) {
      return {
        status: 'INCOMPLETE',
        message: `Cannot review work package: ${incomplete.length} tasks are not completed yet`,
        incompleteTasks: incomplete.map(t => t.taskId)
      };
    }
    
    // Ensure the work package is marked as completed
    if (workPackage.status !== 'COMPLETED') {
      workPackage.status = 'COMPLETED';
      await workPackage.save();
    }
    
    // Update project state
    const projectId = workPackage.projectId;
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    const updatedState = {
      ...currentState,
      completedWorkPackages: [
        ...(currentState.completedWorkPackages || []),
        {
          id: workPackage.id,
          wpId: workPackage.wpId,
          name: workPackage.name
        }
      ]
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    // Check if all work packages are complete
    const allWPs = await WorkPackage.findAll({ where: { projectId } });
    const allWPsComplete = allWPs.every(wp => wp.status === 'COMPLETED');
    
    if (allWPsComplete) {
      // Project is complete
      const project = await Project.findByPk(projectId);
      project.status = 'COMPLETED';
      await project.save();
      
      return {
        status: 'PROJECT_COMPLETED',
        message: 'All work packages are complete. Project finished successfully.',
        workPackage
      };
    }
    
    return {
      status: 'COMPLETED',
      message: `Work package ${workPackage.wpId} completed successfully`,
      workPackage
    };
  }
}

module.exports = new QAService();