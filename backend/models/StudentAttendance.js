const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    studentCode: {
        type: String,
        trim: true,
        default: ''
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    course: {
        type: String,
        trim: true,
        default: ''
    },
    date: {
        type: String, // DD/MM/YYYY or YYYY-MM-DD
        required: true
    },
    dateObj: {
        type: Date
    },
    checkIn: {
        type: String,
        default: '--'
    },
    checkOut: {
        type: String,
        default: '--'
    },
    duration: {
        type: String,
        default: '0h 0m'
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Half Day', 'Late', 'Excused', 'In Office'],
        default: 'Present'
    },
    workSummary: {
        type: String,
        trim: true,
        default: ''
    },
    portalCheckInAt: Date,
    portalActive: Boolean
}, { timestamps: true });

studentAttendanceSchema.index({ tenantId: 1, date: 1 });
studentAttendanceSchema.index({ tenantId: 1, studentCode: 1, date: 1 });
studentAttendanceSchema.index({ tenantId: 1, studentId: 1, dateObj: 1 }, {
    unique: true, partialFilterExpression: { portalActive: true }
});

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
