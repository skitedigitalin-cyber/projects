const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { Leave, Notification } = require('../models/RobotriqLeave');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const admin = requireRobotriqRole('Admin');
const staff = requireRobotriqRole('Employee', 'Manager', 'Sales');
const order = { createdAt: -1, _id: -1 };
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

function validateId(req, res, next, id) {
    if (!objectId(id)) return res.sendStatus(404);
    next();
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function owner(req) {
    const { userId, ownerType } = req.robotriqLeaveOwner;
    return { tenantId, userId, ownerType };
}

const requester = express.Router();
requester.param('id', validateId);

requester.get('/', async (req, res) => {
    const scope = owner(req);
    const [leaves, notifications] = await Promise.all([
        Leave.find(scope).select('fromDate toDate reason status').sort(order).lean(),
        Notification.find(scope).select('title type message read createdAt').sort(order).lean()
    ]);
    res.json({ leaves, notifications });
});

requester.post('/', async (req, res) => {
    const { fromDate, toDate, reason } = req.body || {};
    if (!validDate(fromDate) || !validDate(toDate) || fromDate > toDate || typeof reason !== 'string' ||
        !reason.trim() || reason.length > 2000) {
        return res.status(400).json({ message: 'Enter a valid leave date range and reason.' });
    }
    const { userName, role } = req.robotriqLeaveOwner;
    const row = await Leave.create({ ...owner(req), userName, role, fromDate, toDate, reason: reason.trim(), status: 'Pending' });
    res.status(201).json(row);
});

requester.patch('/notifications/:id/read', async (req, res) => {
    const result = await Notification.updateOne({ ...owner(req), _id: req.params.id }, { $set: { read: true } });
    return res.sendStatus(result.matchedCount ? 204 : 404);
});

requester.delete('/notifications/:id', async (req, res) => {
    const result = await Notification.deleteOne({ ...owner(req), _id: req.params.id });
    return res.sendStatus(result.deletedCount ? 204 : 404);
});

const staffRouter = express.Router();
staffRouter.use(protect);
staffRouter.use('/mine', staff, async (req, res, next) => {
    const user = await User.findOne({ _id: req.user.userId, tenantId, isActive: true })
        .select('name role').lean();
    if (!user) return res.sendStatus(403);
    req.robotriqLeaveOwner = { ownerType: 'staff', userId: user._id, userName: user.name, role: user.role.toLowerCase() };
    next();
}, requester);
staffRouter.use(admin);
staffRouter.param('id', validateId);

staffRouter.get('/', async (req, res) => {
    res.json(await Leave.find({ tenantId }).sort(order).lean());
});

staffRouter.get('/unassigned-notifications', async (req, res) => {
    res.json(await Notification.find({ tenantId, ownerType: 'unresolved' })
        .select('title message type createdAt').sort(order).lean());
});

staffRouter.patch('/:id/status', async (req, res) => {
    const { status } = req.body || {};
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Choose Approved or Rejected.' });
    const row = await mongoose.connection.transaction(async session => {
        const filter = { tenantId, _id: req.params.id };
        const changed = await Leave.findOneAndUpdate({ ...filter, status: { $ne: status } }, { $set: { status } }, { new: true, session });
        if (!changed) return Leave.findOne(filter).session(session);
        if (changed.ownerType !== 'unresolved') {
            await Notification.create([{
                tenantId, ownerType: changed.ownerType, userId: changed.userId, type: 'leave_update',
                title: `Leave ${status}`, message: `Your leave request for ${changed.fromDate} to ${changed.toDate} was ${status.toLowerCase()}.`,
                data: { leaveId: changed._id }, read: false
            }], { session });
        }
        return changed;
    });
    if (!row) return res.sendStatus(404);
    res.json(row);
});

staffRouter.delete('/:id', async (req, res) => {
    const result = await Leave.deleteOne({ tenantId, _id: req.params.id });
    res.sendStatus(result.deletedCount ? 204 : 404);
});

staffRouter.post('/delete-selected', async (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(objectId)) {
        return res.status(400).json({ message: 'Select between 1 and 500 leave requests.' });
    }
    const result = await Leave.deleteMany({ tenantId, _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
});

module.exports = { requester, staffRouter };
