const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    componentName: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    specification: { type: String, trim: true, default: '' },
    purchasePrice: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0, default: 0 },
    stockQty: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RobotriqItem', schema, 'robotriq_items');
