const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, default: 2 },
    timeSlot: { type: String, default: '' },
    type: { 
        type: String, 
        enum: ['Personal Work', 'Late Coming', 'Early Leaving', 'During Shift', 'Medical / Emergency'], 
        default: 'Personal Work' 
    },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    managerComments: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
