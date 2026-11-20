const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

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
