const express = require('express');
const { AdminQuote, ServiceReport } = require('../models/RobotriqDocumentHistory');
const { TrainingLead } = require('../models/RobotriqTrainingHistory');
const { DirectEnquiry } = require('../models/RobotriqEnquiry');
const Item = require('../models/RobotriqItem');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
router.use(protect, requireRobotriqRole('Admin'));

router.get('/admin-quotes', async (req, res) => {
    const quotes = await AdminQuote.find({ tenantId }).select('-tenantId -__v').sort({ createdAt: -1 }).lean();
    const refs = field => quotes.map(row => row[field]).filter(Boolean);
    const [training, direct, items] = await Promise.all([
        TrainingLead.find({ tenantId, _id: { $in: refs('lead') } }).select('name codeNo').lean(),
        DirectEnquiry.find({ tenantId, _id: { $in: refs('robotriqLead') } }).select('customerName enquiryId').lean(),
        Item.find({ tenantId, _id: { $in: quotes.flatMap(row => (row.items || []).map(item => item.item).filter(Boolean)) } })
            .select('componentName description brand specification').lean()
    ]);
    res.json({ quotes, training, direct, items });
});

router.get('/service-reports', async (req, res) => {
    res.json(await ServiceReport.find({ tenantId }).select('-tenantId -__v').sort({ createdAt: -1 }).lean());
});

module.exports = router;
