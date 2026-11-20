const Leave = require('../models/Leave');
const Employee = require('../models/Employee');

// HR API: Get all leaves for the company
exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ tenantId: req.user.tenantId }).populate('employeeId', 'firstName lastName employeeId department');
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Update leave status (Approve/Reject)
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, managerComments } = req.body;
        const leave = await Leave.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!leave) return res.status(404).json({ message: 'Leave request not found' });

        leave.status = status;
        leave.managerComments = managerComments;
        await leave.save();
        res.json(leave);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Employee API: Apply for leave
exports.applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const leave = new Leave({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            leaveType,
            startDate,
            endDate,
            reason
        });

        await leave.save();
        res.status(201).json({ message: 'Leave request submitted successfully', leave });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Employee API: Get My Leaves
exports.getMyLeaves = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const leaves = await Leave.find({ tenantId: req.user.tenantId, employeeId: employee._id }).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
