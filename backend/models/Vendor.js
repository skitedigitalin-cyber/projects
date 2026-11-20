const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    vendorId: { type: String, unique: true }, // e.g. VEND-001
    
    // Basic Info
    vendorName: { type: String, required: true },
    companyName: String,
    contactPerson: String,
    phone: String,
    email: String,
    
    // Tax & Compliance
    gstNumber: String,
    panNumber: String,
    address: String,
    
    // Bank Details
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    
    // Financial Details
    paymentTerms: { type: String, enum: ['Immediate', '15 days', '30 days', '45 days', '60 days'], default: 'Immediate' },
    openingBalance: { type: Number, default: 0 },
    
    // Derived/Updated fields
    totalPurchaseAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountPayable: { type: Number, default: 0 },
    
    notes: String
}, { timestamps: true });

// Pre-save hook to generate vendorId and update amountPayable
vendorSchema.pre('save', async function () {
    if (!this.vendorId) {
        const count = await mongoose.model('Vendor').countDocuments({ tenantId: this.tenantId });
        this.vendorId = `VEND-${(count + 1).toString().padStart(4, '0')}`;
    }
    
    // Calculate payable amount automatically (Opening Balance + Total Purchases - Paid)
    this.amountPayable = this.openingBalance + this.totalPurchaseAmount - this.amountPaid;
});

module.exports = mongoose.model('Vendor', vendorSchema);
