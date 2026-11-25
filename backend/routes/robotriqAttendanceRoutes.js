const express = require('express');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const StaffAccess = require('../models/RobotriqStaffAccess');
const Request = require('../models/RobotriqCheckoutRequest');
const { LegacyAttendance } = require('../models/RobotriqPayrollHistory');
const { Notification } = require('../models/RobotriqLeave');
const { payrollDay } = require('../utils/robotriqPayroll');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
const admin = requireRobotriqRole('Admin');
const staff = requireRobotriqRole('Employee', 'Manager', 'Sales');
const statuses = ['Present', 'Absent', 'Half Day', 'On Leave', 'In Office'];
const indiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const dateOrder = { date: -1, _id: -1 };
const legacyFields = 'userName date checkIn checkOut status duration workSummary';
const requestFields = 'userName date reason status ownerType';

router.use(protect);
router.param('id', (req, res, next, id) => /^[a-f0-9]{24}$/i.test(id) ? next() : res.sendStatus(404));

router.get('/mine', staff, async (req, res) => {
    const userId = req.user.userId;
    const [identity, requests] = await Promise.all([
        StaffAccess.findOne({ tenantId, currentUserId: userId }).select('legacyUserId').lean(),
        Request.find({ tenantId, userId, ownerType: 'staff' }).select(requestFields).sort(dateOrder).lean()
    ]);
    const history = identity?.legacyUserId ? await LegacyAttendance.find({ tenantId, userId: identity.legacyUserId, role: { $ne: 'student' } })
        .select(legacyFields).sort({ createdAt: -1, _id: -1 }).lean() : [];
    res.json({ history, requests });
});

router.post('/mine/checkout-request', staff, async (req, res) => {
    const { date, reason } = req.body || {};
    if (typeof date !== 'string' || !date || payrollDay(date) !== date || date > indiaDay.format(new Date()) ||
        typeof reason !== 'string' || !reason.trim() || reason.length > 2000) {
        return res.status(400).json({ message: 'Enter a valid date and reason for the missed checkout.' });
    }
    const user = await User.findOne({ tenantId, _id: req.user.userId, isActive: true }).select('name').lean();
    if (!user) return res.sendStatus(403);
    await Request.init();
    try {
        const row = await Request.create({ tenantId, userId: user._id, ownerType: 'staff', userName: user.name,
            date, reason: reason.trim(), status: 'Pending' });
        res.status(201).json(row);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'There is already a pending request for this date.' });
        throw error;
    }
});

router.get('/', admin, async (req, res) => {
    const [attendance, employees, history, requests] = await Promise.all([
        Attendance.find({ tenantId }).select('employeeId date checkInTime checkOutTime status totalWorkingMinutes notes').sort(dateOrder).lean(),
        Employee.find({ tenantId }).select('firstName lastName employeeId').lean(),
        LegacyAttendance.find({ tenantId, role: { $ne: 'student' } }).select(legacyFields).sort({ createdAt: -1, _id: -1 }).lean(),
        Request.find({ tenantId }).select(requestFields).sort(dateOrder).lean()
    ]);
    const roster = new Map(employees.map(row => [String(row._id), row]));
    res.json({
        attendance: attendance.map(row => {
            const employee = roster.get(String(row.employeeId));
            return { ...row, userName: [employee?.firstName, employee?.lastName].filter(Boolean).join(' '), date: indiaDay.format(row.date) };
        }), history, requests
    });
});

router.patch('/:id/status', admin, async (req, res) => {
    if (!statuses.includes(req.body?.status)) return res.status(400).json({ message: 'Choose a valid attendance status.' });
    const updated = await Attendance.findOneAndUpdate({ tenantId, _id: req.params.id },
        { $set: { status: req.body.status } }, { returnDocument: 'after', runValidators: true })
        .select('status').lean();
    if (!updated) return res.sendStatus(404);
    res.json(updated);
});

router.post('/checkout-requests/:id/approve', admin, async (req, res) => {
    const filter = { tenantId, _id: req.params.id };
    const row = await mongoose.connection.transaction(async session => {
        const approved = await Request.findOneAndUpdate({ ...filter, status: 'Pending' },
            { $set: { status: 'Approved', approvedAt: new Date() } }, { returnDocument: 'after', session });
        if (!approved) return Request.findOne({ ...filter, status: 'Approved' }).session(session);
        if (approved.ownerType === 'staff') {
            await Notification.create([{
                tenantId, userId: approved.userId, ownerType: 'staff', type: 'checkout_accepted',
                title: 'Check-Out Accepted', message: `Your check-out request for ${approved.date} has been accepted by Admin.`,
                data: { checkoutRequestId: approved._id }, read: false
            }], { session });
        }
        return approved;
    });
    if (!row) return res.sendStatus(404);
    res.json({ _id: row._id, status: row.status });
});

router.delete('/checkout-requests/:id', admin, async (req, res) => {
    const removed = await Request.deleteOne({ tenantId, _id: req.params.id, status: 'Pending' });
    res.sendStatus(removed.deletedCount ? 204 : 404);
});

module.exports = router;
