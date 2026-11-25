const mongoose = require('mongoose');

const tenantId = { type: mongoose.Schema.Types.ObjectId, required: true, index: true };
const rosterSchema = new mongoose.Schema({
    tenantId,
    fullName: { type: String, required: true },
    empId: String,
    role: { type: String, enum: ['employee', 'manager'], required: true },
    salary: Number,
    perDaySalary: Number
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
    tenantId,
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    currentStudentId: mongoose.Schema.Types.ObjectId,
    userName: String,
    role: { type: String, required: true },
    date: { type: String, required: true },
    status: String,
    checkIn: String,
    checkOut: String,
    duration: String,
    workSummary: String
}, { timestamps: true });
attendanceSchema.index({ tenantId: 1, currentStudentId: 1, date: 1 });

module.exports = {
    LegacyRoster: mongoose.model('RobotriqLegacyPayrollRoster', rosterSchema, 'robotriq_legacy_payroll_roster'),
    LegacyAttendance: mongoose.model('RobotriqLegacyAttendance', attendanceSchema, 'robotriq_legacy_attendance')
};
