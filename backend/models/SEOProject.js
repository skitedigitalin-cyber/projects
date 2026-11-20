const mongoose = require('mongoose');

const customTaskSchema = new mongoose.Schema({
    type: { type: String, enum: ['OnPage', 'OffPage', 'Technical', 'GoogleAds'], required: true },
    description: { type: String, required: true },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

const seoChecklistSchema = new mongoose.Schema({
    category: { type: String, required: true },
    taskName: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    completedAt: { type: Date }
});

const seoProjectSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientName: { type: String, required: true },
    businessName: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    assignedSpecialist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    clientStatus: { type: String, enum: ['Pending', 'Onboarding', 'Active', 'Completed'], default: 'Pending' },
    projectStatus: { type: String, enum: ['Pending', 'In Progress', 'Testing', 'Completed'], default: 'Pending' },
    startDate: { type: Date },
    endDate: { type: Date },
    advancePaymentDate: { type: Date },
    fullPaymentDate: { type: Date },
    checklist: [seoChecklistSchema],
    customTasks: [customTaskSchema]
}, { timestamps: true });

module.exports = mongoose.model('SEOProject', seoProjectSchema);
