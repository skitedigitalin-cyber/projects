const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The login account
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    dob: { type: String, default: '' },
    photo: { type: String, default: '' },
    department: { type: String },
    designation: { type: String },
    role: { type: String, default: 'Employee' },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    shift: { type: String, enum: ['General', 'Morning', 'Evening', 'Night', 'Flexible'], default: 'General' },
    workLocation: { type: String, default: 'Office' },
    employmentType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'], default: 'Full-Time' },
    dateOfJoining: { type: Date, default: Date.now },
    salaryBasic: { type: Number, default: 0 },
    perDaySalary: { type: Number, default: 0 },
    panNumber: { type: String, trim: true, uppercase: true },
    aadharNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

// Compound index to ensure uniqueness of employeeId per tenant
employeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
