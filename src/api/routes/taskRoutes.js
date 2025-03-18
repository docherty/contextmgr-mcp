const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

// Task routes
router.post('/workpackage/:workPackageId', taskController.createTask);
router.get('/workpackage/:workPackageId', taskController.getTasks);
router.get('/:id', taskController.getTask);
router.patch('/:id', taskController.updateTask);
router.post('/:id/start', taskController.startTask);
router.post('/:id/complete', taskController.completeTask);
router.post('/:id/checkpoint', taskController.saveCheckpoint);
router.get('/:id/resume', taskController.resumeTask);
router.get('/next/project/:projectId', taskController.getNextPendingTask);
router.post('/:id/qa/start', taskController.startQAReview);
router.post('/:id/qa/complete', taskController.completeQAReview);
router.post('/:id/fix', taskController.createFixTask);
router.get('/qa/project/:projectId', taskController.getTasksForQA);

module.exports = router;