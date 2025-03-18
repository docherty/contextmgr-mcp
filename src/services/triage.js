const Project = require('../db/models/Project');
const ProjectState = require('../db/models/ProjectState');
const orchestratorService = require('./orchestrator');

class TriageService {
  /**
   * Record initial project assessment
   * @param {String} projectId - Project ID
   * @param {Object} assessmentData - Triage assessment data
   * @returns {Object} Updated project state
   */
  async recordAssessment(projectId, assessmentData) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Update project knowledge base
    const knowledgeBase = project.knowledgeBase || {};
    project.knowledgeBase = {
      ...knowledgeBase,
      triageAssessment: assessmentData
    };
    
    await project.save();
    
    // Create new project state
    const currentState = await orchestratorService.getCurrentState(projectId);
    const updatedState = {
      ...currentState,
      triageComplete: true,
      triageAssessment: assessmentData,
      pendingActions: ['Create development plan']
    };
    
    const state = await ProjectState.create({
      projectId,
      state: updatedState,
      checkpoint: true
    });
    
    // Transition to planning role
    return orchestratorService.transitionRole(projectId, 'PLANNING', {
      triageAssessment: assessmentData
    });
  }

  /**
   * Request additional information from user
   * @param {String} projectId - Project ID
   * @param {Array} questions - Questions to ask the user
   * @returns {Object} Updated project state with pending questions
   */
  async requestInformation(projectId, questions) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Get current state
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    // Add questions to state
    const updatedState = {
      ...currentState,
      pendingQuestions: questions,
      waitingForUserInput: true
    };
    
    // Save state
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    return updatedState;
  }

  /**
   * Record user responses to triage questions
   * @param {String} projectId - Project ID
   * @param {Object} responses - User responses to questions
   * @returns {Object} Updated project state
   */
  async recordUserResponses(projectId, responses) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Get current state
    const currentState = await orchestratorService.getCurrentState(projectId);
    
    // Add responses to knowledge base
    const knowledgeBase = project.knowledgeBase || {};
    project.knowledgeBase = {
      ...knowledgeBase,
      userResponses: {
        ...(knowledgeBase.userResponses || {}),
        ...responses
      }
    };
    
    await project.save();
    
    // Update state
    const updatedState = {
      ...currentState,
      pendingQuestions: [],
      waitingForUserInput: false,
      latestResponses: responses
    };
    
    await ProjectState.create({
      projectId,
      state: updatedState
    });
    
    return updatedState;
  }
}

module.exports = new TriageService();