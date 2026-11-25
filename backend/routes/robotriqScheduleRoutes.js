const express = require('express');
const Schedule = require('../models/RobotriqSchedule');
const protect = require('../middleware/authMiddleware');
const { tenantId: robotriqTenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
router.use(protect, requireRobotriqRole('Admin'));

router.get('/:group', async (req, res) => {
    const schedule = await Schedule.findOne({
        tenantId: robotriqTenantId,
        group: req.params.group.trim()
    }).lean();
    res.json(schedule);
});

router.put('/:group', async (req, res) => {
    const group = req.params.group.trim();
    const { weeklySchedule } = req.body;
    if (!group || !Array.isArray(weeklySchedule) || !weeklySchedule.length ||
        weeklySchedule.some(slot => !slot || typeof slot.topic !== 'string' ||
            !slot.topic.trim() || typeof slot.trainer !== 'string' || typeof slot.link !== 'string')) {
        return res.status(400).json({ message: 'Enter at least one class topic.' });
    }
    const slots = weeklySchedule.map(({ topic, trainer, link }, index) => ({
        dayNum: index + 1,
        topic: topic.trim(),
        trainer: trainer.trim(),
        link: link.trim()
    }));
    const schedule = await Schedule.findOneAndUpdate(
        { tenantId: robotriqTenantId, group },
        { $set: { course: group, weeklySchedule: slots } },
        { upsert: true, new: true, runValidators: true }
    );
    res.json(schedule);
});

module.exports = router;
