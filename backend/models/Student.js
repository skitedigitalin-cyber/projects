const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    studentId: {
        type: String,
        required: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    fees: {
        type: Number,
        default: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    pendingAmount: {
        type: Number,
        default: 0
    },
    orderId: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    dob: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        default: ''
    },
    photo: {
        type: String,
        default: ''
    },
    selectedCourses: [{
        type: String,
        trim: true
    }],
    collegeOrCompany: {
        type: String,
        trim: true,
        default: ''
    },
    level: {
        type: String,
        trim: true,
        default: 'Standard'
    },
    preferredType: {
        type: String,
        trim: true,
        default: 'Offline'
    },
    joiningDate: {
        type: String,
        default: ''
    },
    endingDate: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Enrolled', 'In Progress', 'Completed', 'Discontinued'],
        default: 'Enrolled'
    }
}, { timestamps: true });

// Compound unique index per tenant
studentSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
