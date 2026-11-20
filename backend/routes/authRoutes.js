const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const workspaceAccess = require('../controllers/workspaceAccessController');

const auth = require('../middleware/authMiddleware');

// Routes
router.post('/register', authController.registerClient);
router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);
router.get('/workspace-access', auth, workspaceAccess.getWorkspaceAccess);
router.patch('/workspace-access/:id', auth, workspaceAccess.updateWorkspaceAccess);
router.put('/theme', auth, authController.updateTheme);
router.put('/invoice-template', auth, authController.updateInvoiceTemplate);
router.get('/invoice-branding', auth, authController.getInvoiceBranding);
router.put('/invoice-branding', auth, authController.updateInvoiceBranding);

module.exports = router;
