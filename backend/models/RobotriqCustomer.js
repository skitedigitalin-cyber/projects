const mongoose = require('mongoose');

const fields = ['companyName', 'customerName', 'phone', 'email', 'gstNo', 'address'];
const schema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ...Object.fromEntries(fields.map(field => [field, {
        type: String, trim: true, required: field === 'customerName', default: ''
    }]))
}, { timestamps: true });

module.exports = mongoose.model('RobotriqCustomer', schema, 'robotriq_customers');
