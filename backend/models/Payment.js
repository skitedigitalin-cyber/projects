const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    paymentId: { type: String, unique: true }, // Auto Generated
    receiptNumber: { type: String }, // Official Payment Receipt Number (e.g. RCP-2026-0001)
    
    paymentType: { type: String, enum: ['Inward', 'Outward'], required: true }, // Inward (from Customer) or Outward (to Vendor)
    
    // Links to Customer/Vendor
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    
    // Links to specific invoice or bill (optional)
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    
    category: { type: String, default: 'General' }, // Useful for Direct Income / Direct Expense
    
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    
    paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'], required: true },
    transactionId: String,
    referenceNumber: String,
    
    notes: String
}, { timestamps: true });

paymentSchema.pre('save', function () {
    if (!this.isNew) return;

    // A document ID stays unique across tenants, concurrent saves, and deletions.
    const reference = this._id.toHexString().toUpperCase();
    if (!this.paymentId) {
        this.paymentId = `PAY-${reference}`;
    }
    if (!this.receiptNumber) {
        this.receiptNumber = `RCP-${new Date().getFullYear()}-${reference}`;
    }
});

module.exports = mongoose.model('Payment', paymentSchema);
