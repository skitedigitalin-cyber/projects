const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    tenantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tenant', 
        required: true 
    },
    receiptNumber: { 
        type: String, 
        required: true 
    }, // Format: RCP-2026-0001
    
    // Customer who paid
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true 
    },
    
    // Optional link to specific invoice
    invoiceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Invoice' 
    },
    
    amount: { 
        type: Number, 
        required: true,
        min: 1
    },
    receiptDate: { 
        type: Date, 
        default: Date.now,
        required: true 
    },
    
    paymentMode: { 
        type: String, 
        enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'], 
        default: 'Bank Transfer',
        required: true 
    },
    transactionId: { 
        type: String, 
        default: '' 
    }, // UTR / Txn number / UPI ref
    
    notes: { 
        type: String, 
        default: '' 
    },
    
    status: { 
        type: String, 
        enum: ['Received', 'Cleared', 'Cancelled'], 
        default: 'Received' 
    },

    // Reference to linked payment in cashflow (optional)
    paymentRefId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Payment' 
    }
}, { timestamps: true });

// Auto-generate receiptNumber before validation if missing
receiptSchema.pre('validate', async function () {
    if (!this.receiptNumber && this.tenantId) {
        const year = new Date(this.receiptDate || Date.now()).getFullYear();
        const count = await mongoose.model('Receipt').countDocuments({ tenantId: this.tenantId });
        this.receiptNumber = `RCP-${year}-${(count + 1).toString().padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Receipt', receiptSchema);
