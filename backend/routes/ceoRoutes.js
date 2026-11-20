const express = require('express');
const router = express.Router();
const { getClients, createClient, updateClientModules, toggleClientStatus, getSettings, updateSettings, updateClientTrial, deleteClient } = require('../controllers/ceoController');
const auth = require('../middleware/authMiddleware');

// Middleware to check if user is CEO
const verifyCeo = (req, res, next) => {
    if (req.user.role !== 'CEO') {
        return res.status(403).json({ message: 'Access Denied: CEO only' });
    }
    next();
};

router.use(auth);
router.use(verifyCeo);

router.route('/clients').get(getClients).post(createClient);
router.delete('/clients/:id', deleteClient);
router.put('/clients/:id/modules', updateClientModules);
router.put('/clients/:id/toggle-status', toggleClientStatus);
router.put('/clients/:id/trial', updateClientTrial);

router.route('/settings').get(getSettings).post(updateSettings);

module.exports = router;
