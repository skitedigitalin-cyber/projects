const mongoose = require('mongoose');

const contentItemSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['Script', 'Shoot', 'Edit', 'Post', 'Design', 'PostSchedule'], 
        required: true 
    },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    details: { type: String },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }
}, { timestamps: true });

const socialMediaProjectSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientName: { type: String, required: true },
    businessName: { type: String },
    phone: { type: String },
    email: { type: String },
    month: { type: String },
    status: { type: String, enum: ['Active', 'Completed', 'Paused'], default: 'Active' },
    contentItems: [contentItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('SocialMediaProject', socialMediaProjectSchema);
