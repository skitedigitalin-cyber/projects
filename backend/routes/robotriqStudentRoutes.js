const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const StudentTask = require('../models/StudentTask');
const Schedule = require('../models/RobotriqSchedule');
const LegacyTask = require('../models/RobotriqLegacyTask');
const { LegacyAttendance } = require('../models/RobotriqPayrollHistory');
const { requester: leaveRequester } = require('./robotriqLeaveRoutes');
const { student: bookings } = require('./robotriqBookingRoutes');

const tenantId = '6afd35731172da4b0de9a48e';
const audience = 'robotriq-students';
const router = express.Router();
const attempts = new Map();
const windowMs = 15 * 60 * 1000;
const dummyHash = bcrypt.hashSync('robotriq-invalid-login', 10);
const indiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const indiaTime = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true
});
const attendanceFields = 'date checkIn checkOut status duration workSummary portalActive';

router.use((req, res, next) => {
    const secret = process.env.ROBOTRIQ_STUDENT_JWT_SECRET;
    if (!secret || secret.length < 32 || secret === process.env.JWT_SECRET) {
        return res.status(503).json({ message: 'Student sign-in is unavailable.' });
    }
    res.locals.studentSecret = secret;
    res.set('Cache-Control', 'no-store');
    next();
});

router.post('/login', async (req, res) => {
    const now = Date.now();
    if (attempts.size >= 10000) {
        for (const [ip, entry] of attempts) if (entry.expires <= now) attempts.delete(ip);
        if (attempts.size >= 10000 && !attempts.has(req.ip)) {
            return res.status(429).json({ message: 'Too many attempts. Try again later.' });
        }
    }
    let limit = attempts.get(req.ip);
    if (!limit || limit.expires <= now) {
        limit = { expires: now + windowMs, count: 0 };
        attempts.set(req.ip, limit);
    }
    if (++limit.count > 30) {
        return res.status(429).json({ message: 'Too many attempts. Try again later.' });
    }

    const { identifier, password } = req.body || {};
    if (typeof identifier !== 'string' || !identifier.trim() || identifier.length > 254 ||
        typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ message: 'Enter your student ID or email and password.' });
    }
    const login = identifier.trim();
    const students = await Student.find({
        tenantId,
        status: { $ne: 'Discontinued' },
        $or: [{ studentId: login }, { email: login }]
    }).collation({ locale: 'en', strength: 2 }).select('_id password').limit(2).lean();
    const student = students.length === 1 ? students[0] : null;
    const hash = student?.password;
    const supportedHash = typeof hash === 'string' && /^\$2[aby]\$(?:0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}$/.test(hash);
    const matched = await bcrypt.compare(password, supportedHash ? hash : dummyHash);
    if (!supportedHash || !matched) {
        return res.status(401).json({ message: 'Invalid student sign-in.' });
    }

    limit.count--;
    const token = jwt.sign({}, res.locals.studentSecret, {
        subject: String(student._id), audience, algorithm: 'HS256', expiresIn: '1h'
    });
    res.json({ token });
});

async function requireStudent(req, res, next) {
    const token = /^Bearer (\S+)$/.exec(req.get('authorization') || '')?.[1];
    let studentId;
    try {
        studentId = jwt.verify(token, res.locals.studentSecret, {
            audience, algorithms: ['HS256']
        }).sub;
    } catch {
        return res.status(401).json({ message: 'Sign in to the student portal.' });
    }
    if (!/^[a-f0-9]{24}$/.test(studentId)) return res.sendStatus(401);
    const student = await Student.findOne({
        _id: studentId, tenantId, status: { $ne: 'Discontinued' }
    }).select('fullName studentId course fees paidAmount pendingAmount').lean();
    if (!student) return res.sendStatus(401);
    req.robotriqStudent = student;
    next();
}

router.get('/me', requireStudent, async (req, res) => {
    const student = req.robotriqStudent;
    const scope = { tenantId, studentId: student._id };
    const [attendance, tasks, schedule, legacyAttendance, legacyTasks] = await Promise.all([
        StudentAttendance.find(scope).select(attendanceFields).sort({ dateObj: -1, _id: -1 }).lean(),
        StudentTask.find(scope).select('title description dueDate status').sort({ dueDate: 1 }).lean(),
        Schedule.findOne({ tenantId, group: student.course.trim() }).select('weeklySchedule').lean(),
        LegacyAttendance.find({ tenantId, currentStudentId: student._id, role: 'student' })
            .select('date checkIn checkOut status duration workSummary').sort({ createdAt: -1, _id: -1 }).lean(),
        LegacyTask.find({ tenantId, ownerType: 'student', currentOwnerId: student._id })
            .select('title description dueDate status').sort({ dueDate: 1 }).lean()
    ]);
    const activeAttendance = attendance.find(row => row.portalActive && row.date === indiaDay.format(new Date()));
    res.json({
        student, attendance, activeAttendance: activeAttendance || null, legacyAttendance,
        tasks: [...tasks, ...legacyTasks.map(row => ({ ...row, legacy: true }))], schedule: schedule?.weeklySchedule || []
    });
});

function attendanceScope(student, now) {
    return { tenantId, studentId: student._id, dateObj: new Date(indiaDay.format(now)), portalActive: true };
}

router.post('/attendance/check-in', requireStudent, async (req, res) => {
    const student = req.robotriqStudent;
    const now = new Date();
    const scope = attendanceScope(student, now);
    await StudentAttendance.init();
    try {
        const row = await StudentAttendance.create({
            ...scope, date: indiaDay.format(now), studentCode: student.studentId,
            studentName: student.fullName, course: student.course, checkIn: indiaTime.format(now),
            status: 'In Office', portalCheckInAt: now
        });
        res.status(201).json({ _id: row._id, checkIn: row.checkIn, status: row.status });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'You are already checked in today.' });
        throw error;
    }
});

router.post('/attendance/check-out', requireStudent, async (req, res) => {
    const { workSummary } = req.body || {};
    if (typeof workSummary !== 'string' || workSummary.trim().length < 5 || workSummary.length > 2000) {
        return res.status(400).json({ message: 'Enter today’s topic in at least five characters.' });
    }
    const now = new Date();
    const scope = attendanceScope(req.robotriqStudent, now);
    const active = await StudentAttendance.findOne(scope).select('portalCheckInAt').lean();
    if (!active?.portalCheckInAt) return res.status(409).json({ message: 'No active check-in for today.' });

    const minutes = Math.max(0, Math.floor(now.getTime() / 60000) - Math.floor(active.portalCheckInAt.getTime() / 60000));
    const status = minutes >= 360 ? 'Present' : minutes >= 240 ? 'Half Day' : 'Absent';
    const result = await StudentAttendance.updateOne({ ...scope, _id: active._id }, { $set: {
        status, checkOut: indiaTime.format(now), duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
        workSummary: workSummary.trim(), portalActive: false
    } }, { runValidators: true });
    if (!result.matchedCount) return res.status(409).json({ message: 'This attendance session is already closed.' });
    res.json({ _id: active._id, status });
});

router.patch('/tasks/:id/complete', requireStudent, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const legacy = req.query.source === 'legacy';
    const Model = legacy ? LegacyTask : StudentTask;
    const owned = legacy
        ? { ownerType: 'student', currentOwnerId: req.robotriqStudent._id }
        : { studentId: req.robotriqStudent._id };
    const scope = { ...owned, tenantId, _id: req.params.id };
    const completed = await Model.findOneAndUpdate({ ...scope, status: { $ne: 'Completed' } }, {
        $set: { status: 'Completed', completedAt: new Date() }
    }, { new: true }).select('title description dueDate status').lean();
    if (completed) return res.json(completed);
    const existing = await Model.findOne({ ...scope, status: 'Completed' }).select('title description dueDate status').lean();
    if (!existing) return res.sendStatus(404);
    res.json(existing);
});

router.use('/leave', requireStudent, (req, res, next) => {
    const student = req.robotriqStudent;
    req.robotriqLeaveOwner = { ownerType: 'student', userId: student._id, userName: student.fullName, role: 'student' };
    next();
}, leaveRequester);
router.use('/bookings', requireStudent, bookings);

module.exports = router;
