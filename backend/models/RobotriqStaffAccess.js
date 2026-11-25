const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyUserId: mongoose.Schema.Types.ObjectId,
    currentUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyRole: String,
    authorizedRole: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    enabled: { type: Boolean, default: false },
    permissions: { type: Map, of: Boolean, default: {} }
}, { timestamps: true });

schema.index({ tenantId: 1, currentUserId: 1 }, { unique: true });

module.exports = mongoose.model('RobotriqStaffAccess', schema, 'robotriq_staff_access');
