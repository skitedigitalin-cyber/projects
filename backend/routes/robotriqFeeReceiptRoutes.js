const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const { Account } = require('../models/RobotriqLedger');
const { pattern, parseLegacyReceipt, nextReceiptNumber } = require('../utils/robotriqFeeReceipt');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const scope = { tenantId, type: 'Income' };
const receiptScope = { ...scope, $or: [{ feeReceipt: { $exists: true } }, { desc: pattern }] };
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const modes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'NEFT'];
const validDay = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const day = new Date(value);
    return Number.isFinite(day.getTime()) && day.toISOString().startsWith(value);
};

function parseInput(body) {
    const { number, studentId, date, paymentMode, amount, reference = '', nextDueDate = '' } = body || {};
    if (typeof number !== 'string' || !/^[A-Za-z0-9/-]{1,48}$/.test(number) || !objectId(studentId) ||
        !validDay(date) || !modes.includes(paymentMode) || !Number.isFinite(amount) || amount <= 0 ||
        !Number.isSafeInteger(Math.round(amount * 100)) || Math.round(amount * 100) / 100 !== amount ||
        typeof reference !== 'string' || reference.length > 150 || (nextDueDate && !validDay(nextDueDate))) return null;
    return { number: number.toUpperCase(), studentId, date, paymentMode, amount, reference: reference.trim(), nextDueDate };
}

function publicReceipt(row) {
    return {
        _id: row._id, updatedAt: row.updatedAt, date: row.date, amount: row.amount,
        historical: !row.feeReceipt, ...(row.feeReceipt || parseLegacyReceipt(row)),
        ...(row.historicalStudentId ? { studentId: row.historicalStudentId } : {})
    };
}

function invalid(status, message) {
    const error = new Error(message);
    error.receiptStatus = status;
    return error;
}

async function withReceiptTransaction(res, callback, status = 200) {
    try {
        const result = await mongoose.connection.transaction(callback);
        if (status === 204) return res.sendStatus(204);
        res.status(status).json(result);
    } catch (error) {
        if (error.receiptStatus) return res.status(error.receiptStatus).json({ message: error.message });
        if (error.code === 11000) return res.status(409).json({ message: 'This receipt number is already in use.' });
        throw error;
    }
}

async function updateBalance(student, difference, session) {
    const paid = Math.round(Number(student.paidAmount || 0) * 100) + Math.round(difference * 100);
    if (!Number.isSafeInteger(paid) || paid < 0) throw invalid(409, 'The stored fee balance needs reconciliation.');
    const fees = Math.round(Number(student.fees || 0) * 100);
    if (!Number.isSafeInteger(fees) || fees < 0) throw invalid(409, 'The stored fee balance needs reconciliation.');
    student.paidAmount = paid / 100;
    student.pendingAmount = Math.max(0, fees - paid) / 100;
    await student.save({ session });
}

async function existingReceipt(id, updatedAt, session) {
    const row = await Account.findOne({ ...scope, _id: id, 'feeReceipt.number': { $exists: true } }).session(session);
    if (!row) throw invalid(404, 'Editable student receipt not found.');
    if (updatedAt !== row.updatedAt?.toISOString()) throw invalid(409, 'This receipt changed. Reload it before editing.');
    return row;
}

async function saveReceipt(input, session, current) {
    if (current && String(current.feeReceipt.studentId) !== input.studentId) {
        throw invalid(400, 'The student on an issued receipt cannot be changed.');
    }
    const duplicate = await Account.exists({
        ...scope, ...(current ? { _id: { $ne: current._id } } : {}),
        $or: [{ 'feeReceipt.number': input.number }, { desc: { $regex: `^Receipt:\\s*${input.number}(?:\\s|$)`, $options: 'i' } }]
    }).session(session);
    if (duplicate) throw invalid(409, 'This receipt number is already in use.');
    const student = await Student.findOne({ tenantId, _id: input.studentId }).session(session);
    if (!student) throw invalid(404, 'Robotriq student not found.');
    const previouslyPaid = current ? current.feeReceipt.previouslyPaid : Number(student.paidAmount || 0);
    const totalFees = current ? current.feeReceipt.totalFees : Number(student.fees || 0);
    if (!student.orderId?.trim()) throw invalid(409, 'This student needs an order ID before issuing a receipt.');
    await updateBalance(student, input.amount - (current?.amount || 0), session);
    const row = current || new Account(scope);
    row.date = input.date;
    row.amount = input.amount;
    row.status = 'Paid';
    row.feeReceipt = {
        number: input.number, studentId: student._id, orderId: current?.feeReceipt.orderId || student.orderId,
        studentName: current?.feeReceipt.studentName || student.fullName, course: current?.feeReceipt.course || student.course,
        address: current?.feeReceipt.address ?? student.address, paymentMode: input.paymentMode,
        reference: input.reference, nextDueDate: input.nextDueDate, totalFees, previouslyPaid,
        balance: Math.max(0, Math.round((totalFees - previouslyPaid - input.amount) * 100) / 100)
    };
    row.desc = `Receipt: ${input.number} (Order: ${row.feeReceipt.orderId}) - ${row.feeReceipt.studentName} (${row.feeReceipt.course})`;
    await row.save({ session });
    return publicReceipt(row.toObject());
}

router.use(protect, requireRobotriqPermission('paymentReceipt'));
router.param('id', (req, res, next, id) => objectId(id) ? next() : res.sendStatus(404));

router.get('/', async (req, res) => {
    const [rows, students] = await Promise.all([
        Account.find(receiptScope).sort({ date: -1, createdAt: -1, _id: -1 }).lean(),
        Student.find({ tenantId }).select('studentId orderId fullName course address fees paidAmount pendingAmount')
            .sort({ fullName: 1 }).lean()
    ]);
    const receipts = rows.map(publicReceipt);
    const year = new Intl.DateTimeFormat('en', { year: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date());
    res.json({ students, receipts, nextNumber: nextReceiptNumber(receipts.map(row => row.number || ''), year) });
});

router.post('/', (req, res) => {
    const input = parseInput(req.body);
    if (!input) return res.status(400).json({ message: 'Enter valid receipt details.' });
    return withReceiptTransaction(res, session => saveReceipt(input, session), 201);
});

router.put('/:id', (req, res) => {
    const input = parseInput(req.body);
    if (!input) return res.status(400).json({ message: 'Enter valid receipt details.' });
    return withReceiptTransaction(res, async session => {
        const row = await existingReceipt(req.params.id, req.body.updatedAt, session);
        return saveReceipt(input, session, row);
    });
});

router.delete('/:id', requireRobotriqRole('Admin'), (req, res) => withReceiptTransaction(res, async session => {
    const row = await existingReceipt(req.params.id, req.body?.updatedAt, session);
    const student = await Student.findOne({ tenantId, _id: row.feeReceipt.studentId }).session(session);
    if (!student) throw invalid(409, 'The student account needs reconciliation.');
    await updateBalance(student, -row.amount, session);
    await row.deleteOne({ session });
}, 204));

module.exports = router;
