const mongoose = require('mongoose');

const ownership = {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyUserId: mongoose.Schema.Types.ObjectId,
    ownerType: { type: String, enum: ['staff', 'student', 'unresolved'], required: true }
};
const leaveSchema = new mongoose.Schema({
    ...ownership,
    userName: { type: String, required: true },
    role: { type: String, required: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
    ...ownership,
    type: String,
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false }
}, { timestamps: true });

leaveSchema.index({ tenantId: 1, ownerType: 1, userId: 1 });
notificationSchema.index({ tenantId: 1, ownerType: 1, userId: 1, createdAt: -1 });

module.exports = {
    Leave: mongoose.model('RobotriqLeave', leaveSchema, 'robotriq_leaves'),
    Notification: mongoose.model('RobotriqNotification', notificationSchema, 'robotriq_notifications')
};
