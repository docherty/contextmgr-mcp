const WorkPackage = require('../../db/models/WorkPackage');
const Task = require('../../db/models/Task');
const planningService = require('../../services/planning');
const qaService = require('../../services/qa');

// Work Package controller for handling work package-related API requests
const workPackageController = {
  // Create a new work package
  async createWorkPackage(req, res) {
    try {
      const projectId = req.params.projectId;
      const workPackageData = req.body;
      
      if (!workPackageData.name) {
        return res.status(400).json({
          error: true,
          message: 'Work package name is required'
        });
      }
      
      const workPackage = await planningService.createWorkPackage(projectId, workPackageData);
      
      return res.status(201).json({
        success: true,
        message: 'Work package created successfully',
        workPackage
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create work package',
        details: error.message
      });
    }
  },
  
  // Get all work packages for a project
  async getWorkPackages(req, res) {
    try {
      const projectId = req.params.projectId;
      
      const workPackages = await WorkPackage.findAll({
        where: { projectId },
        order: [['priority', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        workPackages
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch work packages',
        details: error.message
      });
    }
  },
  
  // Get a specific work package by ID
  async getWorkPackage(req, res) {
    try {
      const workPackageId = req.params.id;
      
      const workPackage = await WorkPackage.findByPk(workPackageId);
      
      if (!workPackage) {
        return res.status(404).json({
          error: true,
          message: 'Work package not found'
        });
      }
      
      // Get tasks for this work package
      const tasks = await Task.findAll({
        where: { workPackageId },
        order: [['priority', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        workPackage: {
          ...workPackage.toJSON(),
          tasks
        }
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch work package',
        details: error.message
      });
    }
  },
  
  // Update a work package
  async updateWorkPackage(req, res) {
    try {
      const workPackageId = req.params.id;
      const updates = req.body;
      
      const workPackage = await planningService.updateWorkPackage(workPackageId, updates);
      
      return res.status(200).json({
        success: true,
        message: 'Work package updated successfully',
        workPackage
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to update work package',
        details: error.message
      });
    }
  },
  
  // Review completed work package
  async reviewWorkPackage(req, res) {
    try {
      const workPackageId = req.params.id;
      
      const reviewResults = await qaService.reviewWorkPackage(workPackageId);
      
      return res.status(200).json({
        success: true,
        message: 'Work package review completed',
        reviewResults
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to review work package',
        details: error.message
      });
    }
  },
  
  // Get work package progress
  async getWorkPackageProgress(req, res) {
    try {
      const workPackageId = req.params.id;
      
      const workPackage = await WorkPackage.findByPk(workPackageId);
      
      if (!workPackage) {
        return res.status(404).json({
          error: true,
          message: 'Work package not found'
        });
      }
      
      // Get task statistics
      const tasks = await Task.findAll({ where: { workPackageId } });
      
      const taskStats = {
        total: tasks.length,
        planned: tasks.filter(t => t.status === 'PLANNED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        readyForQA: tasks.filter(t => t.status === 'READY_FOR_QA').length,
        qaInProgress: tasks.filter(t => t.status === 'QA_IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        failed: tasks.filter(t => t.status === 'FAILED').length
      };
      
      return res.status(200).json({
        success: true,
        progress: workPackage.progress,
        status: workPackage.status,
        taskStats
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to get work package progress',
        details: error.message
      });
    }
  }
};

module.exports = workPackageController;