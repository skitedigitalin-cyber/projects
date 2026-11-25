const express = require('express');
const { Types } = require('mongoose');
const { SalesLead } = require('../models/RobotriqEnquiry');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const tenant = new Types.ObjectId(tenantId);

router.get('/', protect, requireRobotriqSalesPermission('salesDashboard'), async (req, res) => {
    const [overview] = await SalesLead.aggregate([
        { $match: { tenantId: tenant } },
        { $sort: { createdAt: -1, _id: -1 } },
        { $facet: {
            counts: [{ $group: { _id: { $ifNull: ['$status', 'New'] }, count: { $sum: 1 } } }],
            recent: [{ $limit: 5 }, { $project: { enquiryId: 1, enquiryDate: 1, customerName: 1, type: 1, status: 1 } }]
        } }
    ]);
    res.json({ total: overview.counts.reduce((sum, row) => sum + row.count, 0), counts: overview.counts, recent: overview.recent });
});

module.exports = router;
