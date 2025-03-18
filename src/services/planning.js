const { v4: uuidv4 } = require('uuid');
const Project = require('../db/models/Project');
const WorkPackage = require('../db/models/WorkPackage');
const Task = require('../db/models/Task');
const ProjectState = require('../db/models/ProjectState');
const orchestratorService = require('./orchestrator');

class PlanningService {
  /**
   * Create a new work package
   * @param {String} projectId - Project ID
   * @param {Object} workPackageData - Work package information
   * @returns {Object} Created work package
   */
  async createWorkPackage(projectId, workPackageData) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Generate work package ID (e.g., WP001)
    const existingWPs = await WorkPackage.count({ where: { projectId } });
    const wpId = `WP${String(existingWPs + 1).padStart(3, '0')}`;
    
    const workPackage = await WorkPackage.create({
      ...workPackageData,
      wpId,
      projectId,
      status: 'PLANNED'
    });
    
    // Update project state
    const currentState = await orchestratorService.getCurrentState(projectId);
    const workPackages = currentState.workPackages || [];
    
    const updatedState = {
      ...currentState,
      workPackages: [
        ...workPackages,
        {
          id: workPackage.id,
          wpId,
          name: workPackage.name,
          status: workPackage.status
        }
      ]
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    return workPackage;
  }
  
  /**
   * Create a new task in a work package
   * @param {String} workPackageId - Work package ID
   * @param {Object} taskData - Task information
   * @returns {Object} Created task
   */
  async createTask(workPackageId, taskData) {
    const workPackage = await WorkPackage.findByPk(workPackageId);
    
    if (!workPackage) {
      throw new Error('Work package not found');
    }
    
    // Generate task ID (e.g., WP001-01)
    const existingTasks = await Task.count({ where: { workPackageId } });
    const taskId = `${workPackage.wpId}-${String(existingTasks + 1).padStart(2, '0')}`;
    
    const task = await Task.create({
      ...taskData,
      taskId,
      workPackageId,
      status: 'PLANNED'
    });
    
    // Update project state
    const project = await Project.findByPk(workPackage.projectId);
    const currentState = await orchestratorService.getCurrentState(project.id);
    const tasks = currentState.tasks || [];
    
    const updatedState = {
      ...currentState,
      tasks: [
        ...tasks,
        {
          id: task.id,
          taskId,
          name: task.name,
          status: task.status,
          filePath: task.filePath,
          workPackageId: workPackage.id
        }
      ]
    };
    
    await ProjectState.create({
      projectId: project.id,
      state: updatedState
    });
    
    return task;
  }
  
  /**
   * Update task dependencies
   * @param {String} taskId - Task ID
   * @param {Array} dependencies - Array of taskIds this task depends on
   * @returns {Object} Updated task
   */
  async updateTaskDependencies(taskId, dependencies) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.dependencies = dependencies;
    await task.save();
    
    return task;
  }
  
  /**
   * Complete the planning phase and transition to development
   * @param {String} projectId - Project ID
   * @returns {Object} Updated project state
   */
  async completePlanning(projectId) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Check if we have work packages and tasks
    const workPackages = await WorkPackage.findAll({ where: { projectId } });
    
    if (!workPackages.length) {
      throw new Error('Cannot complete planning: No work packages defined');
    }
    
    let totalTasks = 0;
    for (const wp of workPackages) {
      const taskCount = await Task.count({ where: { workPackageId: wp.id } });
      totalTasks += taskCount;
    }
    
    if (totalTasks === 0) {
      throw new Error('Cannot complete planning: No tasks defined');
    }
    
    // Update project status
    project.status = 'IN_PROGRESS';
    await project.save();
    
    // Transition to development role
    return orchestratorService.transitionRole(projectId, 'DEVELOPMENT', {
      message: 'Planning complete, ready to start development',
      workPackageCount: workPackages.length,
      taskCount: totalTasks
    });
  }
  
  /**
   * Update work package properties
   * @param {String} workPackageId - Work package ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated work package
   */
  async updateWorkPackage(workPackageId, updates) {
    const workPackage = await WorkPackage.findByPk(workPackageId);
    
    if (!workPackage) {
      throw new Error('Work package not found');
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'projectId' && key !== 'wpId') {
        workPackage[key] = updates[key];
      }
    });
    
    await workPackage.save();
    return workPackage;
  }
  
  /**
   * Update task properties
   * @param {String} taskId - Task ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated task
   */
  async updateTask(taskId, updates) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'workPackageId' && key !== 'taskId') {
        task[key] = updates[key];
      }
    });
    
    await task.save();
    return task;
  }
  
  /**
   * Get the full development plan for a project
   * @param {String} projectId - Project ID
   * @returns {Object} Complete development plan
   */
  async getDevelopmentPlan(projectId) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Get all work packages with tasks
    const workPackages = await WorkPackage.findAll({ 
      where: { projectId },
      order: [['priority', 'ASC']]
    });
    
    const workPackagesWithTasks = [];
    for (const wp of workPackages) {
      const tasks = await Task.findAll({
        where: { workPackageId: wp.id },
        order: [['priority', 'ASC']]
      });
      
      workPackagesWithTasks.push({
        ...wp.toJSON(),
        tasks
      });
    }
    
    return {
      project: project.toJSON(),
      plan: workPackagesWithTasks
    };
  }
}

module.exports = new PlanningService();