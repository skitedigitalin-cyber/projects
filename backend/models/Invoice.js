const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    invoiceNumber: { type: String, unique: true }, // Auto Generated
    
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    
    items: [invoiceItemSchema],
    
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxGstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
    payments: [{
        amount: Number,
        paymentDate: { type: Date, default: Date.now },
        paymentMode: { type: String, default: 'Bank Transfer' },
        notes: String
    }],
    
    paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
    
    notes: String,
    termsAndConditions: String,
    pdfUrl: String
}, { timestamps: true });

// Pre-save hook for invoice number
invoiceSchema.pre('save', async function () {
    if (!this.invoiceNumber) {
        const count = await mongoose.model('Invoice').countDocuments({ tenantId: this.tenantId });
        this.invoiceNumber = `INV-${(count + 1).toString().padStart(4, '0')}`;
    }
});

// Post-save hook to update Customer's totalInvoiceAmount (Optional logic here or handled in controller)
module.exports = mongoose.model('Invoice', invoiceSchema);
