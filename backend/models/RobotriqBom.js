const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqSalesLead', required: true },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqItem' },
        qty: { type: Number, default: 1 },
        purchasePrice: { type: Number, default: 0 },
        salePrice: { type: Number, default: 0 }
    }],
    totalPurchaseAmount: { type: Number, default: 0 },
    totalSaleAmount: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RobotriqBom', schema, 'robotriq_boms');
