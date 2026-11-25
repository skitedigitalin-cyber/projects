const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentName: { type: String, required: true },
    uid: { type: String, required: true },
    courseName: { type: String, required: true },
    brand: String,
    products: String,
    date: { type: String, required: true },
    source: { type: String, enum: ['current', 'legacy'], required: true },
    legacyId: String,
    historyKey: String
}, { timestamps: true });

schema.index({ tenantId: 1, uid: 1 }, { unique: true, partialFilterExpression: { source: 'current' } });
schema.index({ tenantId: 1, historyKey: 1 }, { unique: true, partialFilterExpression: { source: 'legacy' } });

module.exports = mongoose.model('RobotriqCertificate', schema, 'robotriq_certificates');
