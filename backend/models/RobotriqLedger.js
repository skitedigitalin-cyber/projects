const mongoose = require('mongoose');

const tenantId = { type: mongoose.Schema.Types.ObjectId, required: true, index: true };
const status = { type: String, enum: ['Pending', 'Paid'], default: 'Pending' };
const receiptSchema = new mongoose.Schema({
    number: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: String,
    studentName: String,
    course: String,
    address: String,
    paymentMode: String,
    reference: String,
    nextDueDate: String,
    totalFees: Number,
    previouslyPaid: Number,
    balance: Number
}, { _id: false });

const accountSchema = new mongoose.Schema({
    tenantId,
    type: { type: String, enum: ['Income', 'Expense'], required: true },
    date: { type: String, required: true },
    desc: { type: String, required: true },
    amount: { type: Number, required: true },
    status,
    historicalStudentId: mongoose.Schema.Types.ObjectId,
    feeReceipt: { type: receiptSchema, default: undefined }
}, { timestamps: true });
accountSchema.index({ tenantId: 1, 'feeReceipt.number': 1 }, {
    unique: true, partialFilterExpression: { 'feeReceipt.number': { $type: 'string' } }
});

const expenseSchema = new mongoose.Schema({
    tenantId,
    employeeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    legacyEmployeeId: mongoose.Schema.Types.ObjectId,
    employeeName: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status,
    voidedAt: Date,
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['Expense', 'Allocation'], default: 'Expense' }
}, { timestamps: true });

module.exports = {
    Account: mongoose.model('RobotriqAccount', accountSchema, 'robotriq_accounts'),
    Expense: mongoose.model('RobotriqExpense', expenseSchema, 'robotriq_expenses')
};
