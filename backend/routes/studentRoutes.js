const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const { LegacyAttendance } = require('../models/RobotriqPayrollHistory');
const { payrollDay } = require('../utils/robotriqPayroll');
const { tenantId: robotriqTenantId, requireRobotriqRole, requireRobotriqPermission } = require('../middleware/robotriqStaff');

const robotriqAdmin = requireRobotriqRole('Admin');
const robotriqTaskAdmin = (req, res, next) => req.user?.tenantId === robotriqTenantId ? robotriqAdmin(req, res, next) : next();
const attendanceAccess = requireRobotriqPermission('studentAttendance');
const tenantId = robotriqTenantId;

async function robotriqAttendance(req, res) {
    const [active, old, students] = await Promise.all([
        StudentAttendance.find({ tenantId }).select('studentName studentCode course date dateObj checkIn checkOut duration status workSummary').lean(),
        LegacyAttendance.find({ tenantId, role: 'student' }).select('currentStudentId userName date checkIn checkOut duration status workSummary').lean(),
        Student.find({ tenantId }).select('studentId course').lean()
    ]);
    const directory = new Map(students.map(row => [String(row._id), row]));
    const history = old.map(({ currentStudentId, userName, ...row }) => {
        const student = directory.get(String(currentStudentId));
        return { ...row, legacy: true, studentName: userName, studentCode: student?.studentId, course: student?.course };
    });
    const { status, search, fromDate, toDate } = req.query;
    const term = typeof search === 'string' ? search.trim().toLowerCase() : '';
    const records = [...active, ...history].map(row => ({ ...row, date: payrollDay(row.date) || payrollDay(row.dateObj) || row.date,
        status: row.status === 'Halfday' ? 'Half Day' : row.status })).filter(row =>
        (!status || status === 'All' || row.status === status) && (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate) &&
        (!term || [row.studentName, row.studentCode, row.course, row.workSummary].some(value => value?.toLowerCase().includes(term))))
        .sort((a, b) => b.date.localeCompare(a.date) || String(b._id).localeCompare(String(a._id)));
    res.json({ success: true, records, summary: { totalRecords: records.length,
        presentCount: records.filter(row => row.status === 'Present').length,
        absentCount: records.filter(row => row.status === 'Absent').length } });
}

router.get('/attendance', (req, res, next) => {
    if (req.user?.tenantId !== tenantId) return studentController.getStudentAttendances(req, res);
    next();
}, attendanceAccess, robotriqAttendance);
router.post('/attendance', robotriqTaskAdmin, async (req, res) => {
    if (req.user?.tenantId === tenantId) {
        const id = req.body?.studentId;
        if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) return res.status(400).json({ message: 'Choose a Robotriq student.' });
        const student = await Student.findOne({ tenantId, _id: id }).select('fullName studentId course').lean();
        if (!student) return res.sendStatus(404);
        Object.assign(req.body, { studentName: student.fullName, studentCode: student.studentId, course: student.course });
    }
    return studentController.markStudentAttendance(req, res);
});
router.delete('/attendance/:id', robotriqTaskAdmin, studentController.deleteStudentAttendance);

// Student Tasks Routes
router.get('/tasks', robotriqTaskAdmin, studentController.getStudentTasks);
router.post('/tasks', robotriqTaskAdmin, studentController.createStudentTask);
router.put('/tasks/:id', robotriqTaskAdmin, studentController.updateStudentTask);
router.delete('/tasks/:id', robotriqTaskAdmin, studentController.deleteStudentTask);

router.get('/', robotriqTaskAdmin, studentController.getStudents);
router.get('/:id', robotriqTaskAdmin, studentController.getStudentById);
router.post('/', robotriqTaskAdmin, studentController.createStudent);
router.put('/:id', robotriqTaskAdmin, studentController.updateStudent);
router.delete('/:id', robotriqTaskAdmin, studentController.deleteStudent);

module.exports = router;
