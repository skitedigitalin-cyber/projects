const Permission = require('../models/Permission');
const Employee = require('../models/Employee');

// Employee API: Apply for short permission (e.g. 2 hours)
exports.applyPermission = async (req, res) => {
    try {
        const { date, hours, timeSlot, type, reason } = req.body;
        if (!date || !hours || !reason) {
            return res.status(400).json({ message: 'Date, hours, and reason are required.' });
        }

        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date provided.' });
        }

        const permission = new Permission({
            tenantId: req.user.tenantId,
            employeeId: employee._id,
            date: parsedDate,
            hours: Number(hours) || 2,
            timeSlot: timeSlot || '',
            type: type || 'Personal Work',
            reason: reason.trim(),
            status: 'Pending'
        });

        await permission.save();
        res.status(201).json({ message: 'Permission request submitted successfully', permission });
    } catch (error) {
        console.error('Error applying permission:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Employee API: Get My Permissions
exports.getMyPermissions = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user.userId });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const permissions = await Permission.find({
            tenantId: req.user.tenantId,
            employeeId: employee._id
        }).sort({ date: -1, createdAt: -1 });

        res.json(permissions);
    } catch (error) {
        console.error('Error fetching employee permissions:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Get all permission requests across the company
exports.getAllPermissions = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const filter = { tenantId: req.user.tenantId };

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                // Ensure IST day start
                filter.date.$gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00+05:30`);
            }
            if (endDate) {
                // Ensure IST day end
                filter.date.$lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999+05:30`);
            }
        }

        const permissions = await Permission.find(filter)
            .populate('employeeId', 'firstName lastName employeeId department phone role')
            .sort({ date: -1, createdAt: -1 });

        res.json(permissions);
    } catch (error) {
        console.error('Error fetching all permissions:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Update permission status (Approve / Reject)
exports.updatePermissionStatus = async (req, res) => {
    try {
        const { status, managerComments } = req.body;
        if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const permission = await Permission.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId
        });

        if (!permission) return res.status(404).json({ message: 'Permission request not found' });

        permission.status = status;
        if (managerComments !== undefined) {
            permission.managerComments = managerComments;
        }

        if (status === 'Approved') {
            permission.approvedBy = req.user.userId;
            permission.approvedAt = new Date();
        }

        await permission.save();

        const updated = await Permission.findById(permission._id)
            .populate('employeeId', 'firstName lastName employeeId department phone role');

        res.json({ message: `Permission request ${status.toLowerCase()} successfully`, permission: updated });
    } catch (error) {
        console.error('Error updating permission status:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// HR API: Delete permission record
exports.deletePermission = async (req, res) => {
    try {
        const permission = await Permission.findOneAndDelete({
            _id: req.params.id,
            tenantId: req.user.tenantId
        });

        if (!permission) return res.status(404).json({ message: 'Permission request not found' });

        res.json({ message: 'Permission record deleted successfully' });
    } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
