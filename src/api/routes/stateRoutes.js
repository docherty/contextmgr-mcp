const express = require('express');
const stateController = require('../controllers/stateController');

const router = express.Router();

// State routes
router.get('/project/:projectId/current', stateController.getCurrentState);
router.get('/project/:projectId/history', stateController.getStateHistory);
router.get('/project/:projectId/checkpoints', stateController.getCheckpoints);
router.get('/:id', stateController.getStateById);

module.exports = router;