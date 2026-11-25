const mongoose = require('mongoose');

const tenantId = { type: mongoose.Schema.Types.ObjectId, required: true, index: true };
const quoteSchema = new mongoose.Schema({
    tenantId,
    quotationNo: { type: String, required: true },
    currentQuoteId: mongoose.Schema.Types.ObjectId,
    lead: mongoose.Schema.Types.ObjectId,
    robotriqLead: mongoose.Schema.Types.ObjectId,
    customer: mongoose.Schema.Types.ObjectId,
    date: Date,
    items: [{
        item: mongoose.Schema.Types.ObjectId,
        qty: Number,
        salePrice: Number,
        amount: Number
    }],
    totalAmount: Number,
    transportPercent: Number,
    transportAmount: Number,
    gstPercent: Number,
    gstAmount: Number,
    netAmount: Number,
    validityDays: Number,
    customData: mongoose.Schema.Types.Mixed
}, { timestamps: true });
quoteSchema.index({ tenantId: 1, quotationNo: 1 }, { unique: true });

const reportSchema = new mongoose.Schema({
    tenantId,
    reportNo: { type: String, required: true },
    assignedTo: mongoose.Schema.Types.ObjectId,
    currentAssigneeId: mongoose.Schema.Types.ObjectId,
    customerId: mongoose.Schema.Types.ObjectId,
    dateOfService: String,
    customer: String,
    status: String
}, { timestamps: true, strict: false });

module.exports = {
    AdminQuote: mongoose.model('RobotriqLegacyAdminQuote', quoteSchema, 'robotriq_legacy_adminquotes'),
    ServiceReport: mongoose.model('RobotriqServiceReport', reportSchema, 'robotriq_servicereports')
};
