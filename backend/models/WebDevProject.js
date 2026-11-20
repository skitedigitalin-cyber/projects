const mongoose = require('mongoose');

const requirementItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['Requirement', 'Change'], required: true },
    description: { type: String, required: true },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

const checklistItemSchema = new mongoose.Schema({
    item: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    completedAt: { type: Date }
});

const webDevProjectSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientName: { type: String, required: true },
    businessName: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    websiteType: { type: String, enum: ['Normal', 'E-Commerce', 'Static'], default: 'Normal' },
    assignedDeveloper: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    clientStatus: { type: String, enum: ['Pending', 'Onboarding', 'Active', 'Completed'], default: 'Pending' },
    projectStatus: { type: String, enum: ['Pending', 'In Progress', 'Testing', 'Completed'], default: 'Pending' },
    startDate: { type: Date },
    endDate: { type: Date },
    advancePaymentDate: { type: Date },
    fullPaymentDate: { type: Date },
    checklist: [checklistItemSchema],
    requirements: [requirementItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('WebDevProject', webDevProjectSchema);
