const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
});

const purchaseSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    purchaseBillNumber: { type: String, required: true }, // Usually provided by vendor
    internalId: { type: String, unique: true }, // Auto Generated internal ID
    
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    
    billDate: { type: Date, required: true },
    dueDate: { type: Date },
    
    items: [purchaseItemSchema],
    
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxGstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    
    paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
    
    notes: String,
    attachmentUrl: String
}, { timestamps: true });

purchaseSchema.pre('save', async function () {
    if (!this.internalId) {
        const count = await mongoose.model('Purchase').countDocuments({ tenantId: this.tenantId });
        this.internalId = `PUR-${(count + 1).toString().padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
