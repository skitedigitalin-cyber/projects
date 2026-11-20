const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    subDescription: { type: String, default: '' },
    hsn: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    qty: { type: Number, required: true, default: 1 },
    total: { type: Number, required: true, default: 0 }
});

const quoteSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    quoteNo: { type: String, required: true },
    refNo: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },
    clientDetails: {
        name: { type: String, required: true },
        address: { type: String, default: '' },
        gst: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' }
    },
    items: [quoteItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    terms: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['Draft', 'Sent', 'Accepted', 'Declined', 'Converted'], 
        default: 'Sent' 
    },
    notes: { type: String, default: '' }
}, { timestamps: true });

quoteSchema.index({ tenantId: 1, quoteNo: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
