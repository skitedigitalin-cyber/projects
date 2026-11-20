const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    leadId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    companyName: String,
    mobileNumber: String,
    email: String,
    location: String,
    industry: String,
    leadSource: {
        type: String,
        enum: ['Cold Leads', 'Meta Leads', 'Cold', 'Meta', 'Meta Ads', 'Google', 'Website', 'WhatsApp', 'Referral', 'Cold Call', 'Instagram', 'LinkedIn', 'Other'],
        default: 'Other'
    },
    productServiceInterested: String,
    serviceType: String,
    leadValue: {
        type: Number,
        default: 0
    },
    leadStatus: {
        type: String,
        enum: ['New', 'Contacted', 'Qualified', 'Appointment', 'Proposal Sent', 'Converted', 'Lost', 'Lead', 'Not'],
        default: 'New'
    },
    leadStage: String,
    // ---- New fields for Call Status Tracking ----
    callStatus: {
        type: String,
        default: 'Lead' // Can be Lead, Callback (1)..(5), Not Attend, Rejected
    },
    callbackAlertDate: String,
    callbackAlertTime: String,
    callback1Description: String,
    callback2Description: String,
    callback3Description: String,
    callback4Description: String,
    callback5Description: String,
    rejectReason: String,
    rejectedFromStage: String,
    
    // ---- Stage Specific Notes ----
    qualifiedDetails: String,
    qualifiedNotes: String,
    qualifiedAlertDate: String,
    qualifiedAlertTime: String,
    appointmentDetails: String,
    appointmentNotes: String,
    appointmentAlertDate: String,
    appointmentAlertTime: String,

    followUpStatus: String,
    followUpResponsibility: String,
    remainder2: String,
    remainder2Date: String,
    remainder2Status: String,
    orderStatus: String,
    closing: String,
    callHistory: Array,
    whatsappNumber: String,
    date: String,

    // ---- New fields for Conversion ----
    fullAmount: Number,
    advanceAmount: Number,
    paymentScreenshot: String, // Path to uploaded image if implemented later

    leadTemperature: {
        type: String,
        enum: ['Hot', 'Warm', 'Cold'],
        default: 'Cold'
    },
    assignedSalesperson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastContactDate: Date,
    nextFollowUpDate: Date,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Lead', leadSchema);
