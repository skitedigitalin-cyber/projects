const express = require('express');
const router = express.Router();
const quoteCtrl = require('../controllers/quoteController');
const { tenantId: robotriqTenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');
const { loadRobotriqQuoteOptions } = require('../utils/robotriqAdminQuoteLinks');

const robotriqAdmin = requireRobotriqRole('Admin');
router.use((req, res, next) => req.user.tenantId === robotriqTenantId ? robotriqAdmin(req, res, next) : next());
router.get('/robotriq-options', robotriqAdmin, async (req, res) => {
    res.json(await loadRobotriqQuoteOptions());
});

router.route('/')
    .get(quoteCtrl.getQuotes)
    .post(quoteCtrl.createQuote);

router.route('/:id')
    .get(quoteCtrl.getQuoteById)
    .put(quoteCtrl.updateQuote)
    .delete(quoteCtrl.deleteQuote);

module.exports = router;
