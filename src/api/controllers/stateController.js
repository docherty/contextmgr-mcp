const ProjectState = require('../../db/models/ProjectState');
const orchestratorService = require('../../services/orchestrator');

// State controller for handling project state API requests
const stateController = {
  // Get current state for a project
  async getCurrentState(req, res) {
    try {
      const projectId = req.params.projectId;
      
      const state = await orchestratorService.getCurrentState(projectId);
      
      return res.status(200).json({
        success: true,
        state
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to retrieve current state',
        details: error.message
      });
    }
  },
  
  // Get state history for a project
  async getStateHistory(req, res) {
    try {
      const projectId = req.params.projectId;
      const limit = parseInt(req.query.limit) || 10;
      
      const stateHistory = await ProjectState.findAll({
        where: { projectId },
        order: [['timestamp', 'DESC']],
        limit
      });
      
      return res.status(200).json({
        success: true,
        stateHistory
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to retrieve state history',
        details: error.message
      });
    }
  },
  
  // Get checkpoints for a project
  async getCheckpoints(req, res) {
    try {
      const projectId = req.params.projectId;
      
      const checkpoints = await ProjectState.findAll({
        where: { 
          projectId,
          checkpoint: true
        },
        order: [['timestamp', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        checkpoints
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to retrieve checkpoints',
        details: error.message
      });
    }
  },
  
  // Get specific state by ID
  async getStateById(req, res) {
    try {
      const stateId = req.params.id;
      
      const state = await ProjectState.findByPk(stateId);
      
      if (!state) {
        return res.status(404).json({
          error: true,
          message: 'State not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        state
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Failed to retrieve state',
        details: error.message
      });
    }
  }
};

module.exports = stateController;