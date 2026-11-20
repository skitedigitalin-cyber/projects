const mongoose = require('mongoose');

const studentTaskSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    dueDate: {
        type: String, // 'YYYY-MM-DD'
        default: ''
    },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    submissionNotes: {
        type: String,
        default: ''
    },
    completedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('StudentTask', studentTaskSchema);
