const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Helper to get month start and end dates
const getMonthRange = (monthStr) => {
    let year, monthIndex;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
        const [y, m] = monthStr.split('-').map(Number);
        year = y;
        monthIndex = m - 1;
    } else {
        const now = new Date();
        year = now.getFullYear();
        monthIndex = now.getMonth();
    }

    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    // Last day of month
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const formattedMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    return { startDate, endDate, formattedMonth, year, monthIndex };
};

// GET /api/hr/payroll?month=YYYY-MM
exports.getPayroll = async (req, res) => {
    try {
        const { month } = req.query;
        const { startDate, endDate, formattedMonth, year, monthIndex } = getMonthRange(month);

        // Fetch all active employees
        const employees = await Employee.find({
            tenantId: req.user.tenantId,
            status: 'Active'
        }).sort({ firstName: 1 });

        // Fetch all attendance in this month range
        const attendanceRecords = await Attendance.find({
            tenantId: req.user.tenantId,
            date: { $gte: startDate, $lte: endDate }
        });

        // Days in the month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        let totalPayroll = 0;
        let totalPresentDaysAcrossStaff = 0;
        let staffWithRateCount = 0;
        let sumDailyRates = 0;

        const payrollData = employees.map(emp => {
            const empAttendance = attendanceRecords.filter(
                a => a.employeeId.toString() === emp._id.toString()
            );

            const presentRecords = empAttendance.filter(a => a.status === 'Present');
            const halfDayRecords = empAttendance.filter(a => a.status === 'Half Day');
            const onLeaveRecords = empAttendance.filter(a => a.status === 'On Leave');
            const absentRecords = empAttendance.filter(a => a.status === 'Absent');

            const presentCount = presentRecords.length;
            const halfDayCount = halfDayRecords.length;
            const onLeaveCount = onLeaveRecords.length;
            const absentCount = absentRecords.length;

            // Effective present days (Full day = 1, Half day = 0.5)
            const effectiveDays = presentCount + (halfDayCount * 0.5);

            // Daily rate (per-day salary)
            const perDaySalary = Number(emp.perDaySalary) || 0;
            const calculatedSalary = Math.round(effectiveDays * perDaySalary);

            // Present date list
            const presentDates = [
                ...presentRecords.map(r => ({ date: r.date.toISOString().split('T')[0], type: 'Full Day' })),
                ...halfDayRecords.map(r => ({ date: r.date.toISOString().split('T')[0], type: 'Half Day' }))
            ].sort((a, b) => new Date(a.date) - new Date(b.date));

            totalPayroll += calculatedSalary;
            totalPresentDaysAcrossStaff += effectiveDays;
            if (perDaySalary > 0) {
                staffWithRateCount++;
                sumDailyRates += perDaySalary;
            }

            return {
                employeeId: emp._id,
                code: emp.employeeId,
                name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
                email: emp.email,
                department: emp.department || 'General',
                designation: emp.designation || 'Staff',
                shift: emp.shift || 'General',
                perDaySalary,
                daysInMonth,
                presentCount,
                halfDayCount,
                onLeaveCount,
                absentCount,
                effectiveDays,
                calculatedSalary,
                presentDates,
                panNumber: emp.panNumber || '',
                aadharNumber: emp.aadharNumber || '',
                bankName: emp.bankName || '',
                accountNumber: emp.accountNumber || '',
                ifscCode: emp.ifscCode || ''
            };
        });

        const avgDailyRate = staffWithRateCount > 0 ? Math.round(sumDailyRates / staffWithRateCount) : 0;

        res.json({
            month: formattedMonth,
            daysInMonth,
            stats: {
                totalPayroll,
                totalPresentDays: totalPresentDaysAcrossStaff,
                employeeCount: employees.length,
                staffWithRateCount,
                avgDailyRate
            },
            records: payrollData
        });

    } catch (error) {
        console.error('Payroll calculation error:', error);
        res.status(500).json({ message: 'Error calculating payroll', error: error.message });
    }
};

// PUT /api/hr/payroll/salary/:employeeId
exports.updateEmployeeSalary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { perDaySalary } = req.body;

        if (perDaySalary === undefined || isNaN(Number(perDaySalary)) || Number(perDaySalary) < 0) {
            return res.status(400).json({ message: 'Valid per-day salary number is required' });
        }

        const employee = await Employee.findOneAndUpdate(
            { _id: employeeId, tenantId: req.user.tenantId },
            { perDaySalary: Number(perDaySalary) },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({
            message: 'Per-day salary updated successfully',
            employee: {
                _id: employee._id,
                name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
                perDaySalary: employee.perDaySalary
            }
        });
    } catch (error) {
        console.error('Error updating employee salary:', error);
        res.status(500).json({ message: 'Server error updating salary', error: error.message });
    }
};

// GET /api/hr/payroll/my-payroll?month=YYYY-MM (Employee self-service)
exports.getMyPayroll = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId, tenantId: req.user.tenantId });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        const { month } = req.query;
        const { startDate, endDate, formattedMonth, year, monthIndex } = getMonthRange(month);

        const attendanceRecords = await Attendance.find({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            date: { $gte: startDate, $lte: endDate }
        });

        const presentRecords = attendanceRecords.filter(a => a.status === 'Present');
        const halfDayRecords = attendanceRecords.filter(a => a.status === 'Half Day');
        const onLeaveRecords = attendanceRecords.filter(a => a.status === 'On Leave');
        const absentRecords = attendanceRecords.filter(a => a.status === 'Absent');

        const presentCount = presentRecords.length;
        const halfDayCount = halfDayRecords.length;
        const onLeaveCount = onLeaveRecords.length;
        const absentCount = absentRecords.length;

        const effectiveDays = presentCount + (halfDayCount * 0.5);
        const perDaySalary = Number(employee.perDaySalary) || 0;
        const calculatedSalary = Math.round(effectiveDays * perDaySalary);

        const presentDates = [
            ...presentRecords.map(r => ({ date: r.date.toISOString().split('T')[0], type: 'Full Day' })),
            ...halfDayRecords.map(r => ({ date: r.date.toISOString().split('T')[0], type: 'Half Day' }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        res.json({
            month: formattedMonth,
            daysInMonth,
            employee: {
                _id: employee._id,
                code: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
                email: employee.email,
                department: employee.department || 'General',
                designation: employee.designation || 'Staff',
                shift: employee.shift || 'General',
                dateOfJoining: employee.dateOfJoining,
                perDaySalary
            },
            presentCount,
            halfDayCount,
            onLeaveCount,
            absentCount,
            effectiveDays,
            calculatedSalary,
            presentDates
        });
    } catch (error) {
        console.error('Error fetching my payroll:', error);
        res.status(500).json({ message: 'Server error retrieving salary details', error: error.message });
    }
};
