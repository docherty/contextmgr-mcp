const express = require('express');
const projectController = require('../controllers/projectController');

const router = express.Router();

// Project routes
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/:id/triage', projectController.submitTriageAssessment);
router.post('/:id/triage/request', projectController.requestTriageInformation);
router.post('/:id/triage/response', projectController.submitTriageResponses);
router.post('/:id/resume', projectController.resumeProject);
router.post('/:id/checkpoint', projectController.createCheckpoint);
router.post('/:id/transition', projectController.transitionRole);
router.patch('/:id/status', projectController.updateProjectStatus);

module.exports = router;