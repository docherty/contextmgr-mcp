const Task = require('../../db/models/Task');
const planningService = require('../../services/planning');
const developmentService = require('../../services/development');
const qaService = require('../../services/qa');

// Task controller for handling task-related API requests
const taskController = {
  // Create a new task
  async createTask(req, res) {
    try {
      const workPackageId = req.params.workPackageId;
      const taskData = req.body;
      
      if (!taskData.name || !taskData.filePath) {
        return res.status(400).json({
          error: true,
          message: 'Task name and filePath are required'
        });
      }
      
      const task = await planningService.createTask(workPackageId, taskData);
      
      return res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create task',
        details: error.message
      });
    }
  },
  
  // Get all tasks for a work package
  async getTasks(req, res) {
    try {
      const workPackageId = req.params.workPackageId;
      
      const tasks = await Task.findAll({
        where: { workPackageId },
        order: [['priority', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        tasks
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch tasks',
        details: error.message
      });
    }
  },
  
  // Get a specific task by ID
  async getTask(req, res) {
    try {
      const taskId = req.params.id;
      
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        return res.status(404).json({
          error: true,
          message: 'Task not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        task
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch task',
        details: error.message
      });
    }
  },
  
  // Update task properties
  async updateTask(req, res) {
    try {
      const taskId = req.params.id;
      const updates = req.body;
      
      const task = await planningService.updateTask(taskId, updates);
      
      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        task
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to update task',
        details: error.message
      });
    }
  },
  
  // Start working on a task
  async startTask(req, res) {
    try {
      const taskId = req.params.id;
      
      const result = await developmentService.startTask(taskId);
      
      return res.status(200).json({
        success: true,
        message: 'Task started successfully',
        task: result.task,
        state: result.state
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to start task',
        details: error.message
      });
    }
  },
  
  // Complete a task (mark as ready for QA)
  async completeTask(req, res) {
    try {
      const taskId = req.params.id;
      const implementationData = req.body;
      
      const result = await developmentService.completeTask(taskId, implementationData);
      
      return res.status(200).json({
        success: true,
        message: 'Task completed and ready for QA',
        task: result.task,
        state: result.state
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to complete task',
        details: error.message
      });
    }
  },
  
  // Save implementation checkpoint
  async saveCheckpoint(req, res) {
    try {
      const taskId = req.params.id;
      const checkpointData = req.body;
      
      const checkpoint = await developmentService.saveImplementationCheckpoint(taskId, checkpointData);
      
      return res.status(200).json({
        success: true,
        message: 'Implementation checkpoint saved',
        checkpoint
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to save checkpoint',
        details: error.message
      });
    }
  },
  
  // Resume work on a task
  async resumeTask(req, res) {
    try {
      const taskId = req.params.id;
      
      const context = await developmentService.resumeTask(taskId);
      
      return res.status(200).json({
        success: true,
        message: 'Task context retrieved for resumption',
        context
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to resume task',
        details: error.message
      });
    }
  },
  
  // Get next pending task for a project
  async getNextPendingTask(req, res) {
    try {
      const projectId = req.params.projectId;
      
      const result = await developmentService.getNextTask(projectId);
      
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to get next pending task',
        details: error.message
      });
    }
  },
  
  // Start QA review for a task
  async startQAReview(req, res) {
    try {
      const taskId = req.params.id;
      
      const context = await qaService.startTaskReview(taskId);
      
      return res.status(200).json({
        success: true,
        message: 'QA review started',
        context
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to start QA review',
        details: error.message
      });
    }
  },
  
  // Complete QA review for a task
  async completeQAReview(req, res) {
    try {
      const taskId = req.params.id;
      const qaResults = req.body;
      
      if (qaResults.passed === undefined) {
        return res.status(400).json({
          error: true,
          message: 'QA results must include passed status'
        });
      }
      
      const result = await qaService.completeTaskReview(taskId, qaResults);
      
      return res.status(200).json({
        success: true,
        message: qaResults.passed ? 'Task passed QA' : 'Task failed QA',
        task: result.task,
        state: result.state
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to complete QA review',
        details: error.message
      });
    }
  },
  
  // Create a fix task for a failed QA task
  async createFixTask(req, res) {
    try {
      const taskId = req.params.id;
      const fixDetails = req.body;
      
      const fixTask = await qaService.createFixTask(taskId, fixDetails);
      
      return res.status(201).json({
        success: true,
        message: 'Fix task created successfully',
        fixTask
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create fix task',
        details: error.message
      });
    }
  },
  
  // Get tasks ready for QA
  async getTasksForQA(req, res) {
    try {
      const projectId = req.params.projectId;
      
      const tasks = await qaService.getTasksReadyForQA(projectId);
      
      return res.status(200).json({
        success: true,
        tasks
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to get tasks ready for QA',
        details: error.message
      });
    }
  }
};

module.exports = taskController;