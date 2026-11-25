const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
    breakStart: { type: Date },
    breakEnd: { type: Date }
});

const attendanceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true }, // Store the date (midnight) for easy querying
    
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    robotriqOpenDay: { type: String },
    breaks: [breakSchema],
    
    status: { 
        type: String, 
        enum: ['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Week Off', 'WFH', 'In Office'],
        default: 'Absent' 
    },
    
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    
    isEarlyCheckout: { type: Boolean, default: false },
    earlyCheckoutMinutes: { type: Number, default: 0 },
    
    totalWorkingMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    
    isLateCheckout: { type: Boolean, default: false },
    checkoutReason: { type: String },
    markedAbsentDueToLateCheckout: { type: Boolean, default: false },
    
    notes: { type: String }
}, { timestamps: true });

// Skite stores one midnight record per day. Robotriq records each shift at its check-in time.
attendanceSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, employeeId: 1, robotriqOpenDay: 1 }, {
    unique: true,
    partialFilterExpression: { robotriqOpenDay: { $exists: true } }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
