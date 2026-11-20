const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Helper to get today's calendar date string in IST (YYYY-MM-DD)
const getISTDateString = (d = new Date()) => {
    return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper to get today's date normalized to IST midnight in UTC
const getTodayDate = () => {
    const todayStr = getISTDateString();
    return new Date(`${todayStr}T00:00:00+05:30`);
};

// Check current status for the logged-in employee
exports.getTodayStatus = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const todayStr = getISTDateString();
        const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

        // Check if there is an unclosed shift from any previous day (before today 00:00 IST)!
        const pendingPreviousCheckout = await Attendance.findOne({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            checkInTime: { $lt: todayStart, $exists: true },
            $or: [{ checkOutTime: null }, { checkOutTime: { $exists: false } }]
        }).sort({ checkInTime: -1 });

        const attendance = await Attendance.findOne({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            $or: [
                { date: { $gte: todayStart, $lte: todayEnd } },
                { checkInTime: { $gte: todayStart, $lte: todayEnd } }
            ]
        });

        res.json({ attendance, pendingPreviousCheckout, shift: employee.shift });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.checkIn = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const todayStr = getISTDateString();
        const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

        // Check for any unclosed shifts from previous days - must check out those first!
        const pendingPrevious = await Attendance.findOne({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            checkInTime: { $lt: todayStart, $exists: true },
            $or: [{ checkOutTime: null }, { checkOutTime: { $exists: false } }]
        });

        if (pendingPrevious) {
            return res.status(400).json({ 
                message: 'You have an unclosed shift from a previous day. Please complete that check-out with reason first.',
                pendingPreviousCheckout: pendingPrevious
            });
        }

        let attendance = await Attendance.findOne({ 
            tenantId: req.user.tenantId, 
            employeeId: employee._id, 
            $or: [
                { date: { $gte: todayStart, $lte: todayEnd } },
                { checkInTime: { $gte: todayStart, $lte: todayEnd } }
            ]
        });

        if (attendance && attendance.checkInTime) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        const now = new Date();
        if (!attendance) {
            attendance = new Attendance({
                tenantId: req.user.tenantId,
                employeeId: employee._id,
                date: todayStart,
                checkInTime: now,
                status: 'Present'
            });
        } else {
            attendance.checkInTime = now;
            attendance.status = 'Present';
        }

        await attendance.save();
        res.json({ message: 'Checked in successfully', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const { notes, attendanceId } = req.body;
        if (!notes || notes.trim() === '') {
            return res.status(400).json({ message: 'Task description / reason is required for check out' });
        }

        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const todayStr = getISTDateString();
        const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

        let attendance = null;

        if (attendanceId) {
            attendance = await Attendance.findOne({
                _id: attendanceId,
                tenantId: req.user.tenantId,
                employeeId: employee._id
            });
        } else {
            // First check if there is an unclosed previous shift
            attendance = await Attendance.findOne({
                tenantId: req.user.tenantId,
                employeeId: employee._id,
                checkInTime: { $lt: todayStart, $exists: true },
                $or: [{ checkOutTime: null }, { checkOutTime: { $exists: false } }]
            }).sort({ checkInTime: -1 });

            // If none, check today's attendance
            if (!attendance) {
                attendance = await Attendance.findOne({ 
                    tenantId: req.user.tenantId, 
                    employeeId: employee._id, 
                    $or: [
                        { date: { $gte: todayStart, $lte: todayEnd } },
                        { checkInTime: { $gte: todayStart, $lte: todayEnd } }
                    ]
                });
            }
        }

        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ message: 'You must check in first' });
        }

        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'Already checked out for this shift' });
        }

        const now = new Date();
        const shiftDateStr = getISTDateString(attendance.checkInTime || attendance.date);
        const isPreviousDay = shiftDateStr < todayStr;

        attendance.checkOutTime = now;
        attendance.notes = notes;
        attendance.checkoutReason = notes;

        // Calculate working hours
        const workingMs = attendance.checkOutTime - attendance.checkInTime;
        attendance.totalWorkingMinutes = Math.floor(workingMs / 60000);

        if (isPreviousDay) {
            // Next-day checkout: mark as Absent penalty per company policy
            attendance.status = 'Absent';
            attendance.isLateCheckout = true;
            attendance.markedAbsentDueToLateCheckout = true;
            attendance.totalWorkingMinutes = 0;
            await attendance.save();

            return res.json({ 
                message: 'Previous shift checked out. Marked as Absent penalty due to next-day checkout.',
                attendance,
                wasPreviousDay: true 
            });
        }

        // Same-day normal checkout:
        // Rule: < 3 hours -> Absent, 3h to < 6h -> Half Day, >= 6h -> Present
        if (attendance.totalWorkingMinutes < 180) {
            attendance.status = 'Absent';
        } else if (attendance.totalWorkingMinutes < 360) {
            attendance.status = 'Half Day';
        } else {
            attendance.status = 'Present';
        }
        attendance.markedAbsentDueToLateCheckout = false;
        attendance.isLateCheckout = false;
        await attendance.save();

        res.json({ message: 'Checked out successfully', attendance, wasPreviousDay: false });
    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.startBreak = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const todayStr = getISTDateString();
        const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

        const attendance = await Attendance.findOne({ 
            tenantId: req.user.tenantId, 
            employeeId: employee._id, 
            $or: [
                { date: { $gte: todayStart, $lte: todayEnd } },
                { checkInTime: { $gte: todayStart, $lte: todayEnd } }
            ]
        });
        if (!attendance || !attendance.checkInTime) return res.status(400).json({ message: 'Must check in first' });
        if (attendance.checkOutTime) return res.status(400).json({ message: 'Cannot take break after check out' });

        attendance.breaks.push({ breakStart: new Date() });
        await attendance.save();
        
        res.json({ message: 'Break started', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.endBreak = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const todayStr = getISTDateString();
        const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${todayStr}T23:59:59.999+05:30`);

        const attendance = await Attendance.findOne({ 
            tenantId: req.user.tenantId, 
            employeeId: employee._id, 
            $or: [
                { date: { $gte: todayStart, $lte: todayEnd } },
                { checkInTime: { $gte: todayStart, $lte: todayEnd } }
            ]
        });
        if (!attendance) return res.status(400).json({ message: 'No active attendance record' });

        const currentBreak = attendance.breaks[attendance.breaks.length - 1];
        if (!currentBreak || currentBreak.breakEnd) {
            return res.status(400).json({ message: 'No active break to end' });
        }

        currentBreak.breakEnd = new Date();
        await attendance.save();

        res.json({ message: 'Break ended', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Get all attendance records (with optional date range)
exports.getAllAttendance = async (req, res) => {
    try {
        const { startDate, endDate, date } = req.query;

        // If specific single 'date' is provided, keep the old behavior (left-join all employees)
        if (date && !startDate && !endDate) {
            let queryDate = new Date(date);
            queryDate.setHours(0, 0, 0, 0);

            const records = await Attendance.find({ 
                tenantId: req.user.tenantId, 
                date: queryDate 
            }).populate('employeeId', 'firstName lastName employeeId department');

            const employees = await Employee.find({ tenantId: req.user.tenantId, status: 'Active' });

            const formattedRecords = employees.map(emp => {
                const record = records.find(r => r.employeeId?._id.toString() === emp._id.toString());
                return {
                    employee: emp,
                    attendance: record || null
                };
            });
            return res.json(formattedRecords);
        }

        // Otherwise, date range query
        let query = { tenantId: req.user.tenantId };
        
        if (startDate || endDate) {
            const startStr = startDate || '2000-01-01';
            const endStr = endDate || '2100-01-01';
            const start = new Date(startStr + 'T00:00:00+05:30');
            const end = new Date(endStr + 'T23:59:59.999+05:30');

            query.$or = [
                { date: { $gte: start, $lte: end } },
                { checkInTime: { $gte: start, $lte: end } }
            ];
        }

        // Just fetch actual records
        const records = await Attendance.find(query)
            .populate('employeeId', 'firstName lastName employeeId department')
            .sort({ checkInTime: -1, date: -1 });

        // Format to match frontend structure { employee, attendance }
        const formattedRecords = records.map(r => ({
            employee: r.employeeId,
            attendance: r
        }));

        res.json(formattedRecords);

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// Employee API: Get all historical attendance records for the logged-in employee
exports.getMyAttendanceRecords = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const records = await Attendance.find({ 
            tenantId: req.user.tenantId, 
            employeeId: employee._id 
        }).sort({ date: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Delete a single attendance record
exports.deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const attendance = await Attendance.findOneAndDelete({
            _id: id,
            tenantId: req.user.tenantId
        });
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        res.json({ message: 'Attendance record deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Bulk delete attendance records (e.g. filtered records by IDs)
exports.bulkDeleteAttendance = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No attendance IDs provided for deletion' });
        }
        const result = await Attendance.deleteMany({
            _id: { $in: ids },
            tenantId: req.user.tenantId
        });
        res.json({ 
            message: `Successfully deleted ${result.deletedCount} attendance record(s)`,
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


