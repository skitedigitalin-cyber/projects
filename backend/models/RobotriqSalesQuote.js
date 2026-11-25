const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quotationNo: { type: String, required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqSalesLead', required: true },
    date: { type: Date, default: Date.now },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqItem' },
        qty: { type: Number, default: 1 },
        salePrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 }
    }],
    totalAmount: { type: Number, default: 0 },
    transportPercent: { type: Number, default: 5 },
    transportAmount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    validityDays: { type: Number, default: 15 },
    customData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

schema.index({ tenantId: 1, quotationNo: 1 }, { unique: true });

module.exports = mongoose.model('RobotriqSalesQuote', schema, 'robotriq_salesquotes');
