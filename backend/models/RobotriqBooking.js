const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyStudentId: mongoose.Schema.Types.ObjectId,
    legacyTeacherId: mongoose.Schema.Types.ObjectId,
    unresolvedStudent: Boolean,
    unresolvedTeacher: Boolean,
    studentName: String,
    teacherName: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: String,
    subject: String,
    status: { type: String, enum: ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'], default: 'Pending' },
    requestedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    rejectedAt: Date,
    completedAt: Date,
    notes: String
}, { timestamps: true });

schema.index({ tenantId: 1, studentId: 1, date: -1 });
schema.index({ tenantId: 1, teacherId: 1, status: 1, date: 1 });

module.exports = mongoose.model('RobotriqBooking', schema, 'robotriq_bookings');
