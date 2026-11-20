const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: String, enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave', 'Permission', 'Other'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    managerComments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
