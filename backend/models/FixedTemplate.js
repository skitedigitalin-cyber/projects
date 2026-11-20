const mongoose = require('mongoose');

const fixedTemplateItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    hsn: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    qty: { type: Number, required: true, default: 1 }
});

const fixedTemplateSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    clientDetails: {
        name: { type: String, required: true },
        addressLine1: { type: String, default: '' },
        addressLine2: { type: String, default: '' },
        location: { type: String, default: '' },
        gstNo: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' }
    },
    items: [fixedTemplateItemSchema],
    taxRate: { type: Number, default: 9 }, // 9 = 18% GST (9% CGST + 9% SGST), 0 = Non-GST
    notes: { type: String, default: '' }
}, { timestamps: true });

fixedTemplateSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('FixedTemplate', fixedTemplateSchema);
