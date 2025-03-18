const Project = require('../../db/models/Project');
const orchestratorService = require('../../services/orchestrator');
const triageService = require('../../services/triage');

// Project controller for handling project-related API requests
const projectController = {
  // Create a new project
  async createProject(req, res) {
    try {
      const projectData = req.body;
      
      if (!projectData.name) {
        return res.status(400).json({
          error: true,
          message: 'Project name is required'
        });
      }
      
      const project = await orchestratorService.initializeProject(projectData);
      
      return res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create project',
        details: error.message
      });
    }
  },
  
  // Get all projects
  async getProjects(req, res) {
    try {
      const projects = await Project.findAll();
      
      return res.status(200).json({
        success: true,
        projects
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch projects',
        details: error.message
      });
    }
  },
  
  // Get a specific project by ID
  async getProject(req, res) {
    try {
      const projectId = req.params.id;
      
      const project = await Project.findByPk(projectId);
      
      if (!project) {
        return res.status(404).json({
          error: true,
          message: 'Project not found'
        });
      }
      
      // Get current state
      const currentState = await orchestratorService.getCurrentState(projectId);
      
      return res.status(200).json({
        success: true,
        project,
        state: currentState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to fetch project',
        details: error.message
      });
    }
  },
  
  // Submit triage assessment for a project
  async submitTriageAssessment(req, res) {
    try {
      const projectId = req.params.id;
      const assessmentData = req.body;
      
      const updatedState = await triageService.recordAssessment(projectId, assessmentData);
      
      return res.status(200).json({
        success: true,
        message: 'Triage assessment recorded',
        state: updatedState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to record triage assessment',
        details: error.message
      });
    }
  },
  
  // Request more information from user during triage
  async requestTriageInformation(req, res) {
    try {
      const projectId = req.params.id;
      const { questions } = req.body;
      
      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({
          error: true,
          message: 'Questions array is required'
        });
      }
      
      const updatedState = await triageService.requestInformation(projectId, questions);
      
      return res.status(200).json({
        success: true,
        message: 'Information request recorded',
        state: updatedState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to request information',
        details: error.message
      });
    }
  },
  
  // Submit user responses to triage questions
  async submitTriageResponses(req, res) {
    try {
      const projectId = req.params.id;
      const responses = req.body;
      
      const updatedState = await triageService.recordUserResponses(projectId, responses);
      
      return res.status(200).json({
        success: true,
        message: 'User responses recorded',
        state: updatedState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to record user responses',
        details: error.message
      });
    }
  },
  
  // Resume project from checkpoint
  async resumeProject(req, res) {
    try {
      const projectId = req.params.id;
      
      const resumeState = await orchestratorService.resumeFromCheckpoint(projectId);
      
      return res.status(200).json({
        success: true,
        message: 'Project resumed from checkpoint',
        resumeState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to resume project',
        details: error.message
      });
    }
  },
  
  // Create a checkpoint for the project
  async createCheckpoint(req, res) {
    try {
      const projectId = req.params.id;
      const checkpointData = req.body;
      
      const checkpoint = await orchestratorService.saveCheckpoint(projectId, checkpointData);
      
      return res.status(200).json({
        success: true,
        message: 'Checkpoint created successfully',
        checkpoint
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create checkpoint',
        details: error.message
      });
    }
  },
  
  // Transition project to a different role
  async transitionRole(req, res) {
    try {
      const projectId = req.params.id;
      const { nextRole, contextData } = req.body;
      
      if (!nextRole) {
        return res.status(400).json({
          error: true,
          message: 'Next role is required'
        });
      }
      
      const validRoles = ['TRIAGE', 'PLANNING', 'DEVELOPMENT', 'QA', 'ORCHESTRATOR'];
      if (!validRoles.includes(nextRole)) {
        return res.status(400).json({
          error: true,
          message: 'Invalid role specified',
          validRoles
        });
      }
      
      const updatedState = await orchestratorService.transitionRole(
        projectId, 
        nextRole, 
        contextData || {}
      );
      
      return res.status(200).json({
        success: true,
        message: `Transitioned to ${nextRole} role`,
        state: updatedState
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to transition role',
        details: error.message
      });
    }
  },
  
  // Update project status
  async updateProjectStatus(req, res) {
    try {
      const projectId = req.params.id;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          error: true,
          message: 'Status is required'
        });
      }
      
      const validStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: 'Invalid status specified',
          validStatuses
        });
      }
      
      const project = await Project.findByPk(projectId);
      
      if (!project) {
        return res.status(404).json({
          error: true,
          message: 'Project not found'
        });
      }
      
      project.status = status;
      await project.save();
      
      return res.status(200).json({
        success: true,
        message: 'Project status updated',
        project
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to update project status',
        details: error.message
      });
    }
  }
};

module.exports = projectController;