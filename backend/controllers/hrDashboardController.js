const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');

exports.getHRWorkspace = async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!['Admin', 'CEO'].includes(role) && !await User.exists({ _id: userId, tenantId, isActive: true, activeModules: 'hr' })) {
            return res.status(403).json({ message: 'HR access required' });
        }
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+05:30`);
        const endOfToday = new Date(`${today}T23:59:59.999+05:30`);
        const bounds = { $gte: monthStart, $lte: endOfToday };
        const [staff, records, leaves, pendingLeaves] = await Promise.all([
            Employee.find({ tenantId, status: 'Active' }).select('firstName lastName designation department').sort({ firstName: 1 }).lean(),
            Attendance.find({ tenantId, $or: [{ date: bounds }, { checkInTime: bounds }] })
                .select('employeeId date checkInTime status isLate').sort({ checkInTime: 1 }).lean(),
            Leave.find({ tenantId, status: 'Pending' }).select('employeeId leaveType startDate endDate reason')
                .populate('employeeId', 'firstName lastName').sort({ startDate: 1 }).limit(5).lean(),
            Leave.countDocuments({ tenantId, status: 'Pending' })
        ]);
        return res.json({ today, staff, records, leaves, pendingLeaves });
    } catch (error) {
        console.error('HR overview unavailable:', error.message);
        return res.status(500).json({ message: 'Could not load the HR overview' });
    }
};

exports.getHRDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Total Active Employees
        const totalEmployees = await Employee.countDocuments({ tenantId, status: 'Active' });

        // 2. Today's Date Boundaries in IST
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const startOfToday = new Date(`${todayStr}T00:00:00+05:30`);
        const endOfToday = new Date(`${todayStr}T23:59:59.999+05:30`);

        // 3. Present Today
        const presentToday = await Attendance.countDocuments({ 
            tenantId, 
            $or: [
                { date: { $gte: startOfToday, $lte: endOfToday } },
                { checkInTime: { $gte: startOfToday, $lte: endOfToday } }
            ]
        });

        // 4. On Leave Today
        const onLeaveToday = await Leave.countDocuments({
            tenantId,
            status: 'Approved',
            startDate: { $lte: endOfToday },
            endDate: { $gte: startOfToday }
        });

        // 5. Absent Today
        // Simplest calculation: Total - Present - On Leave (assuming everyone else is absent)
        const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

        // 6. Pending Leave Approvals
        const pendingLeaves = await Leave.countDocuments({
            tenantId,
            status: 'Pending'
        });

        res.json({
            totalEmployees,
            presentToday,
            onLeaveToday,
            absentToday,
            pendingLeaves
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
