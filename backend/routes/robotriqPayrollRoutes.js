const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { LegacyRoster, LegacyAttendance } = require('../models/RobotriqPayrollHistory');
const { payrollDay, legacyPayroll } = require('../utils/robotriqPayroll');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
const indiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
router.use(protect, requireRobotriqRole('Admin'));

router.get('/', async (req, res) => {
    const { from, to, source } = req.query;
    if (typeof from !== 'string' || typeof to !== 'string' ||
        payrollDay(from) !== from || payrollDay(to) !== to || !from || !to || from > to ||
        !['legacy', 'current'].includes(source)) {
        return res.status(400).json({ message: 'Choose a valid payroll date range and attendance source.' });
    }
    let roster;
    let logs;
    if (source === 'legacy') {
        [roster, logs] = await Promise.all([
            LegacyRoster.find({ tenantId }).select('fullName empId salary perDaySalary').sort({ fullName: 1 }).lean(),
            LegacyAttendance.find({ tenantId, status: 'Present' }).select('userId status date').lean()
        ]);
    } else {
        [roster, logs] = await Promise.all([
            Employee.find({ tenantId, status: 'Active', role: { $in: ['Employee', 'Manager'] } })
                .select('firstName lastName employeeId perDaySalary').sort({ firstName: 1 }).lean(),
            Attendance.find({ tenantId, status: 'Present', date: {
                $gte: new Date(`${from}T00:00:00+05:30`), $lte: new Date(`${to}T23:59:59.999+05:30`)
            } })
                .select('employeeId status date').lean()
        ]);
        logs = logs.map(row => ({ ...row, date: indiaDay.format(row.date) }));
    }
    res.json({ records: legacyPayroll(roster, logs, from, to) });
});

module.exports = router;
