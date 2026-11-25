const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyUserId: mongoose.Schema.Types.ObjectId,
    ownerType: { type: String, enum: ['staff', 'unresolved'], required: true },
    userName: { type: String, required: true },
    date: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    approvedAt: Date
}, { timestamps: true });
schema.index({ tenantId: 1, userId: 1, date: 1 }, {
    unique: true, partialFilterExpression: { status: 'Pending', ownerType: 'staff' }
});

module.exports = mongoose.model('RobotriqCheckoutRequest', schema, 'robotriq_checkout_requests');
