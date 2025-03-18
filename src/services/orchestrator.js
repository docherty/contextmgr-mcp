const Project = require('../db/models/Project');
const WorkPackage = require('../db/models/WorkPackage');
const Task = require('../db/models/Task');
const ProjectState = require('../db/models/ProjectState');

class OrchestratorService {
  /**
   * Initialize a new project and start triage
   * @param {Object} projectData - Project information
   * @returns {Object} Created project
   */
  async initializeProject(projectData) {
    const project = await Project.create({
      name: projectData.name,
      description: projectData.description,
      objectives: projectData.objectives,
      status: 'PLANNING',
      currentRole: 'TRIAGE'
    });
    
    // Initialize project state
    await ProjectState.create({
      projectId: project.id,
      state: {
        activeRole: 'TRIAGE',
        workPackages: [],
        tasks: [],
        pendingActions: ['Complete Triage'],
        knowledgeBase: {}
      },
      checkpoint: true
    });
    
    return project;
  }
  
  /**
   * Transition to the next role in the workflow
   * @param {String} projectId - Project ID
   * @param {String} nextRole - Role to transition to
   * @param {Object} contextData - Data to pass to the next role
   * @returns {Object} Updated project state
   */
  async transitionRole(projectId, nextRole, contextData = {}) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Update project's current role
    project.currentRole = nextRole;
    await project.save();
    
    // Create new project state entry
    const currentState = await this.getCurrentState(projectId);
    
    const newState = {
      ...currentState,
      activeRole: nextRole,
      lastTransition: {
        from: currentState.activeRole,
        to: nextRole,
        timestamp: new Date().toISOString()
      },
      contextData
    };
    
    // Save the new state
    await ProjectState.create({
      projectId,
      state: newState,
      checkpoint: true
    });
    
    return newState;
  }

  /**
   * Get the current state of a project
   * @param {String} projectId - Project ID
   * @returns {Object} Current project state
   */
  async getCurrentState(projectId) {
    const latestState = await ProjectState.findOne({
      where: { projectId },
      order: [['timestamp', 'DESC']]
    });
    
    if (!latestState) {
      throw new Error('No state found for project');
    }
    
    return latestState.state;
  }

  /**
   * Update task status and project state
   * @param {String} taskId - Task ID
   * @param {String} status - New status
   * @param {Object} results - Results/data from task execution
   * @returns {Object} Updated task and project state
   */
  async updateTaskStatus(taskId, status, results = {}) {
    const task = await Task.findByPk(taskId, {
      include: [{ model: WorkPackage, include: [Project] }]
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Update task status
    task.status = status;
    if (results.qaResults) {
      task.qaResults = results.qaResults;
    }
    await task.save();
    
    const projectId = task.WorkPackage.Project.id;
    
    // Update work package progress
    await this.updateWorkPackageProgress(task.WorkPackage.id);
    
    // Create a new project state
    const currentState = await this.getCurrentState(projectId);
    const updatedState = {
      ...currentState,
      lastTaskUpdate: {
        taskId: task.taskId,
        status,
        timestamp: new Date().toISOString()
      }
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    return { task, state: updatedState };
  }

  /**
   * Calculate and update work package progress
   * @param {String} wpId - Work package ID
   * @returns {Object} Updated work package
   */
  async updateWorkPackageProgress(wpId) {
    const workPackage = await WorkPackage.findByPk(wpId);
    const tasks = await Task.findAll({ where: { workPackageId: wpId } });
    
    if (!workPackage || !tasks.length) {
      throw new Error('Work package not found or has no tasks');
    }
    
    // Calculate completion percentage
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const progress = (completedTasks / tasks.length) * 100;
    
    // Update status if all tasks are complete
    let status = workPackage.status;
    if (completedTasks === tasks.length) {
      status = 'COMPLETED';
    } else if (completedTasks > 0) {
      status = 'IN_PROGRESS';
    }
    
    // Update work package
    workPackage.progress = progress;
    workPackage.status = status;
    await workPackage.save();
    
    return workPackage;
  }

  /**
   * Get the next pending task based on dependencies and priorities
   * @param {String} projectId - Project ID
   * @returns {Object|null} Next task or null if none pending
   */
  async getNextPendingTask(projectId) {
    // Get all work packages for project
    const workPackages = await WorkPackage.findAll({
      where: { 
        projectId,
        status: {
          [sequelize.Op.notIn]: ['COMPLETED'] 
        }
      },
      order: [['priority', 'ASC']]
    });
    
    // No work packages or all completed
    if (!workPackages.length) {
      return null;
    }
    
    // For each work package, find pending tasks
    for (const wp of workPackages) {
      const tasks = await Task.findAll({
        where: {
          workPackageId: wp.id,
          status: {
            [sequelize.Op.in]: ['PLANNED', 'FAILED']
          }
        },
        order: [['priority', 'ASC']]
      });
      
      if (!tasks.length) continue;
      
      // Filter for tasks whose dependencies are all completed
      for (const task of tasks) {
        const dependencies = task.dependencies;
        if (!dependencies.length) {
          return task;
        }
        
        const depTasks = await Task.findAll({
          where: {
            taskId: {
              [sequelize.Op.in]: dependencies
            }
          }
        });
        
        const allDepsCompleted = depTasks.every(dt => dt.status === 'COMPLETED');
        if (allDepsCompleted) {
          return task;
        }
      }
    }
    
    return null;
  }

  /**
   * Save checkpoint state for resumption after interruption
   * @param {String} projectId - Project ID
   * @param {Object} checkpointData - Additional data to include in checkpoint
   * @returns {Object} Created checkpoint state
   */
  async saveCheckpoint(projectId, checkpointData = {}) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const currentState = await this.getCurrentState(projectId);
    
    const checkpointState = {
      ...currentState,
      checkpoint: {
        timestamp: new Date().toISOString(),
        data: checkpointData
      }
    };
    
    const state = await ProjectState.create({
      projectId,
      state: checkpointState,
      checkpoint: true
    });
    
    return state;
  }

  /**
   * Resume work from last checkpoint
   * @param {String} projectId - Project ID
   * @returns {Object} Resume state with next actions
   */
  async resumeFromCheckpoint(projectId) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const checkpoint = await ProjectState.findOne({
      where: { 
        projectId,
        checkpoint: true 
      },
      order: [['timestamp', 'DESC']]
    });
    
    if (!checkpoint) {
      throw new Error('No checkpoint found for project');
    }
    
    // Get the current role and state
    const role = project.currentRole;
    const state = checkpoint.state;
    
    // Determine next actions based on role
    let nextActions = [];
    
    switch (role) {
      case 'TRIAGE':
        nextActions = ['Complete triage assessment'];
        break;
      case 'PLANNING':
        nextActions = ['Continue planning work packages and tasks'];
        break;
      case 'DEVELOPMENT':
        // Find next pending task
        const nextTask = await this.getNextPendingTask(projectId);
        if (nextTask) {
          nextActions = [`Continue development of task ${nextTask.taskId}: ${nextTask.name}`];
        } else {
          nextActions = ['All tasks complete, ready for final QA review'];
        }
        break;
      case 'QA':
        // Find tasks ready for QA
        const tasksForQA = await Task.findAll({
          where: { status: 'READY_FOR_QA' },
          include: [{ model: WorkPackage, where: { projectId } }]
        });
        
        if (tasksForQA.length) {
          nextActions = [`Review ${tasksForQA.length} tasks ready for QA`];
        } else {
          nextActions = ['No tasks pending QA, check if all work packages are complete'];
        }
        break;
      default:
        nextActions = ['Determine next step in project workflow'];
    }
    
    return {
      role,
      state,
      nextActions
    };
  }
}

module.exports = new OrchestratorService();