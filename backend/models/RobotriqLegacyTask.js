const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, required: true },
    currentOwnerId: mongoose.Schema.Types.ObjectId,
    ownerType: { type: String, enum: ['student', 'staff', 'unresolved'], required: true },
    userName: { type: String, required: true },
    role: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    dueDate: String,
    status: { type: String, default: 'Pending' },
    completedAt: Date
}, { timestamps: true });

schema.index({ tenantId: 1, ownerType: 1, currentOwnerId: 1 });

module.exports = mongoose.model('RobotriqLegacyTask', schema, 'robotriq_legacy_tasks');
