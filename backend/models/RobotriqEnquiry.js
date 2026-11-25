const mongoose = require('mongoose');

function enquirySchema(collection) {
    const schema = new mongoose.Schema({
        tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        enquiryId: { type: String, required: true },
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'RobotriqCustomer' },
        customerName: { type: String, required: true, trim: true },
        companyName: String,
        phone: String,
        email: String,
        application: String,
        reference: String,
        enquiryDetails: String,
        status: { type: String, default: 'New' },
        enquiryDate: { type: Date, default: Date.now },
        type: { type: String, enum: ['service', 'material', 'project', 'panel', ''] },
        assignedEmployee: mongoose.Schema.Types.ObjectId,
        legacyAssignedEmployee: mongoose.Schema.Types.ObjectId,
        advancePayment: { type: Number, default: 0 },
        fullPayment: { type: Number, default: 0 },
        commitmentDate: Date,
        saleCreatedDate: Date,
        accountCompleted: { type: Boolean, default: false },
        accountCompletedDate: Date,
        priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }
    }, { collection, timestamps: true });
    schema.index({ tenantId: 1, enquiryId: 1 }, { unique: true });
    return schema;
}

module.exports = {
    SalesLead: mongoose.model('RobotriqSalesLead', enquirySchema('robotriq_salesleads')),
    DirectEnquiry: mongoose.model('RobotriqDirectEnquiry', enquirySchema('robotriq_enquiries'))
};
