const express = require('express');
const Lead = require('../models/Lead');
const { TrainingLead, Reminder } = require('../models/RobotriqTrainingHistory');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
const sales = requireRobotriqRole('Admin', 'Sales');
const admin = requireRobotriqRole('Admin');
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

function details(body) {
    const { text, date, type } = body || {};
    if (typeof text !== 'string' || !text.trim() || text.length > 2000 ||
        typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !['note', 'task'].includes(type)) return null;
    const day = new Date(date);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
    return { text: text.trim(), date, type };
}

router.use(protect, sales);
router.param('id', (req, res, next, id) => objectId(id) ? next() : res.sendStatus(404));

router.get('/', async (req, res) => {
    const [reminders, leads, history] = await Promise.all([
        Reminder.find({ tenantId }).sort({ date: 1, createdAt: -1 }).lean(),
        Lead.find({ tenantId }).select('customerName leadId').sort({ customerName: 1 }).lean(),
        TrainingLead.find({ tenantId, currentLeadId: { $exists: false } })
            .select('name codeNo').sort({ name: 1 }).lean()
    ]);
    res.json({
        reminders,
        leads: [...leads.map(row => ({ id: row._id, name: row.customerName, code: row.leadId, source: 'current' })),
            ...history.map(row => ({ id: row._id, name: row.name, code: row.codeNo, source: 'legacy' }))]
    });
});

router.post('/', async (req, res) => {
    const values = details(req.body);
    const { leadId, leadSource } = req.body || {};
    if (!values || !objectId(leadId) || !['current', 'legacy'].includes(leadSource)) {
        return res.status(400).json({ message: 'Choose a lead and enter a valid reminder.' });
    }
    const model = leadSource === 'legacy' ? TrainingLead : Lead;
    const lead = await model.findOne({ tenantId, _id: leadId }).select('customerName name').lean();
    if (!lead) return res.status(404).json({ message: 'Robotriq lead not found.' });
    res.status(201).json(await Reminder.create({ ...values, tenantId, leadId, leadSource, leadName: lead.customerName || lead.name }));
});

router.put('/:id', async (req, res) => {
    const values = details(req.body);
    if (!values) return res.status(400).json({ message: 'Enter a valid reminder.' });
    const saved = await Reminder.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: values }, { new: true });
    if (!saved) return res.sendStatus(404);
    res.json(saved);
});

router.patch('/:id/completed', async (req, res) => {
    if (typeof req.body?.completed !== 'boolean') return res.status(400).json({ message: 'Choose a completion status.' });
    const saved = await Reminder.findOneAndUpdate({ _id: req.params.id, tenantId },
        { $set: { completed: req.body.completed } }, { new: true });
    if (!saved) return res.sendStatus(404);
    res.json(saved);
});

router.delete('/:id', admin, async (req, res) => {
    const result = await Reminder.deleteOne({ _id: req.params.id, tenantId });
    res.sendStatus(result.deletedCount ? 204 : 404);
});

module.exports = router;
