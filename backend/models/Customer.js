const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    customerId: { type: String, unique: true }, // e.g. CUST-001
    
    // Basic Info
    customerName: { type: String, required: true },
    companyName: String,
    contactPerson: String,
    phone: String,
    email: String,
    
    // Tax & Compliance
    gstNumber: String,
    panNumber: String,
    
    // Addresses
    billingAddress: String,
    shippingAddress: String,
    
    // Financial Details
    creditLimit: { type: Number, default: 0 },
    paymentTerms: { type: String, enum: ['Immediate', '15 days', '30 days', '45 days', '60 days'], default: 'Immediate' },
    openingBalance: { type: Number, default: 0 },
    
    // Derived/Updated fields
    totalInvoiceAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    
    notes: String
}, { timestamps: true });

// Pre-save hook to generate customerId
customerSchema.pre('save', async function () {
    if (!this.customerId) {
        const count = await mongoose.model('Customer').countDocuments({ tenantId: this.tenantId });
        this.customerId = `CUST-${(count + 1).toString().padStart(4, '0')}`;
    }
    
    // Calculate pending amount automatically
    this.pendingAmount = this.openingBalance + this.totalInvoiceAmount - this.paidAmount;
});

module.exports = mongoose.model('Customer', customerSchema);
