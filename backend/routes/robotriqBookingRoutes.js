const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/RobotriqBooking');
const Employee = require('../models/Employee');
const Student = require('../models/Student');
const User = require('../models/User');
const { Notification } = require('../models/RobotriqLeave');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const instructorCode = 'RQ/T/24/002';
const historyOrder = { date: -1, startTime: -1, _id: -1 };
const payloadFields = 'teacherName studentName studentId date startTime endTime subject status requestedAt unresolvedStudent unresolvedTeacher';
const studentScope = _id => ({ tenantId, studentId: _id, unresolvedStudent: { $ne: true } });
const trainerScope = _id => ({ tenantId, teacherId: _id, unresolvedTeacher: { $ne: true } });

async function instructor() {
    const employees = await Employee.find({ tenantId, employeeId: instructorCode })
        .select('userId').limit(2).lean();
    if (employees.length !== 1 || !employees[0].userId) return null;
    return User.findOne({
        tenantId, _id: employees[0].userId, isActive: true,
        role: { $in: ['Employee', 'Manager', 'Sales'] }
    }).select('name').lean();
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const day = new Date(value);
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

function timeSlot(value) {
    const time = typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!time || value < '09:00' || value > '15:00') return null;
    return { startTime: value, endTime: `${Number(time[1]) + 3}:${time[2]}` };
}

const student = express.Router();
student.get('/', async (req, res) => {
    const [teacher, bookings] = await Promise.all([
        instructor(),
        Booking.find(studentScope(req.robotriqStudent._id)).select(payloadFields).sort(historyOrder).lean()
    ]);
    res.json({ instructor: teacher?.name || '', bookings });
});

student.post('/', async (req, res) => {
    const { date, startTime } = req.body || {};
    const slot = timeSlot(startTime);
    const today = new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date());
    if (!validDate(date) || date < today || !slot) {
        return res.status(400).json({ message: 'Choose a current or future date and a start time from 09:00 to 15:00.' });
    }
    const teacher = await instructor();
    if (!teacher) return res.status(409).json({ message: 'No instructor is available for bookings. Contact Robotriq.' });
    const learner = req.robotriqStudent;
    const saved = await Booking.create({
        tenantId, studentId: learner._id, studentName: learner.fullName, teacherId: teacher._id, teacherName: teacher.name,
        date, ...slot, status: 'Pending'
    });
    res.status(201).json({ _id: saved._id, status: saved.status });
});

async function withNames(rows) {
    const ids = rows.filter(row => !row.studentName && !row.unresolvedStudent).map(row => row.studentId);
    const students = ids.length ? await Student.find({ tenantId, _id: { $in: ids } }).select('fullName').lean() : [];
    const names = new Map(students.map(row => [String(row._id), row.fullName]));
    return rows.map(row => ({ ...row, studentName: row.studentName || names.get(String(row.studentId)) || '' }));
}

const staff = express.Router();
staff.use(protect);

staff.get('/all', requireRobotriqRole('Admin'), async (req, res) => {
    const rows = await Booking.find({ tenantId }).select(payloadFields).sort({ requestedAt: -1 }).lean();
    res.json(await withNames(rows));
});

const trainer = requireRobotriqRole('Employee', 'Manager', 'Sales');
staff.get('/mine', trainer, async (req, res) => {
    const rows = await Booking.find(trainerScope(req.user.userId)).select(payloadFields).sort(historyOrder).lean();
    res.json(await withNames(rows));
});

staff.patch('/mine/:id/status', trainer, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const { status } = req.body || {};
    if (!['Confirmed', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Choose Confirmed or Rejected.' });
    const filter = { ...trainerScope(req.user.userId), _id: req.params.id };
    const row = await mongoose.connection.transaction(async session => {
        const timestamp = status === 'Confirmed' ? 'confirmedAt' : 'rejectedAt';
        const changed = await Booking.findOneAndUpdate({ ...filter, status: 'Pending' }, { $set: {
            status, [timestamp]: new Date()
        } }, { new: true, session });
        if (!changed) return Booking.findOne({ ...filter, status }).session(session);
        if (!changed.unresolvedStudent) {
            const confirm = status === 'Confirmed';
            await Notification.create([{
                tenantId, ownerType: 'student', userId: changed.studentId,
                type: confirm ? 'class_confirmed' : 'class_rejected',
                title: confirm ? 'Class confirmed' : 'Class declined',
                message: confirm ? `Your class with ${changed.teacherName} is confirmed for ${changed.date} at ${changed.startTime}.`
                    : `Your class booking for ${changed.date} was declined.`,
                data: { bookingId: changed._id }, read: false
            }], { session });
        }
        return changed;
    });
    if (!row) return res.status(404).json({ message: 'Pending booking not found.' });
    res.json({ _id: row._id, status: row.status });
});

module.exports = { student, staff };
