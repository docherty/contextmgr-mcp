const express = require('express');
const workPackageController = require('../controllers/workPackageController');

const router = express.Router();

// Work package routes
router.post('/project/:projectId', workPackageController.createWorkPackage);
router.get('/project/:projectId', workPackageController.getWorkPackages);
router.get('/:id', workPackageController.getWorkPackage);
router.patch('/:id', workPackageController.updateWorkPackage);
router.post('/:id/review', workPackageController.reviewWorkPackage);
router.get('/:id/progress', workPackageController.getWorkPackageProgress);

module.exports = router;