const express = require('express');
const router = express.Router();
const teamCtrl = require('../controllers/teamManagementController');

const SKITE_TENANT_ID = '6af2c94a9d29730751ed2d01';

// Team Management is strictly exclusive to Skite Digital Agency
router.use((req, res, next) => {
    if (req.user?.tenantId?.toString() !== SKITE_TENANT_ID) {
        return res.status(403).json({ message: 'Team Management is exclusive to Skite Digital Agency.' });
    }
    next();
});

// Overview Stats & Team Employees
router.get('/stats', teamCtrl.getStats);
router.get('/employees', teamCtrl.getTeamEmployees);

// Social Media Routes
router.route('/social-media')
    .get(teamCtrl.getSocialMediaProjects)
    .post(teamCtrl.createSocialMediaProject);

router.route('/social-media/:id')
    .get(teamCtrl.getSocialMediaProjectById)
    .put(teamCtrl.updateSocialMediaProject)
    .delete(teamCtrl.deleteSocialMediaProject);

router.post('/social-media/:id/items', teamCtrl.addSocialMediaContentItem);
router.put('/social-media/:id/items/:itemId', teamCtrl.updateSocialMediaContentItemStatus);
router.delete('/social-media/:id/items/:itemId', teamCtrl.deleteSocialMediaContentItem);

// Web Development Routes
router.route('/webdev')
    .get(teamCtrl.getWebDevProjects)
    .post(teamCtrl.createWebDevProject);

router.route('/webdev/:id')
    .get(teamCtrl.getWebDevProjectById)
    .put(teamCtrl.updateWebDevProject)
    .delete(teamCtrl.deleteWebDevProject);

router.post('/webdev/:id/requirements', teamCtrl.addWebDevRequirement);
router.put('/webdev/:id/requirements/:reqId', teamCtrl.updateWebDevRequirementStatus);
router.delete('/webdev/:id/requirements/:reqId', teamCtrl.deleteWebDevRequirement);

router.put('/webdev/:id/checklist/:itemId', teamCtrl.toggleWebDevChecklist);
router.post('/webdev/:id/checklist', teamCtrl.addWebDevChecklistItem);
router.delete('/webdev/:id/checklist/:itemId', teamCtrl.deleteWebDevChecklistItem);

// SEO Routes
router.route('/seo')
    .get(teamCtrl.getSEOProjects)
    .post(teamCtrl.createSEOProject);

router.route('/seo/:id')
    .get(teamCtrl.getSEOProjectById)
    .put(teamCtrl.updateSEOProject)
    .delete(teamCtrl.deleteSEOProject);

router.post('/seo/:id/custom-tasks', teamCtrl.addSEOCustomTask);
router.put('/seo/:id/custom-tasks/:taskId', teamCtrl.updateSEOCustomTaskStatus);
router.delete('/seo/:id/custom-tasks/:taskId', teamCtrl.deleteSEOCustomTask);

router.put('/seo/:id/checklist/:itemId', teamCtrl.toggleSEOChecklistTask);

module.exports = router;
