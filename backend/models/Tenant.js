const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true
    },
    subDomain: {
        type: String,
        unique: true
    },
    subscriptionPlan: {
        type: String,
        default: 'Free Trial'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    activeModules: {
        type: [String],
        default: ['dashboard', 'sales', 'finance', 'hr', 'calendar']
    },
    status: {
        type: String,
        enum: ['trial', 'active', 'expired'],
        default: 'trial'
    },
    validUntil: {
        type: Date
    },
    maxEmployees: {
        type: Number,
        default: 5
    },
    maxLeads: {
        type: Number,
        default: 50
    },
    maxInvoices: {
        type: Number,
        default: 25
    },
    invoiceTemplate: {
        type: String,
        default: 'skite-orange'
    },
    invoiceColor: {
        type: String,
        default: '#FF4500'
    },
    templateColors: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    invoiceLogo: {
        type: String,
        default: ''
    },
    invoiceSign: {
        type: String,
        default: ''
    },
    invoiceSeal: {
        type: String,
        default: ''
    },
    quotationHeaderImage: {
        type: String,
        default: ''
    },
    quotationFooterImage: {
        type: String,
        default: ''
    },
    quotationSeal: {
        type: String,
        default: ''
    },
    quotationSign: {
        type: String,
        default: ''
    },
    quotationBankDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    companyDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lastPaymentId: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tenant', tenantSchema);
