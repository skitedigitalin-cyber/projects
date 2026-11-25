const express = require('express');
const User = require('../models/User');
const { Account, Expense } = require('../models/RobotriqLedger');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqPermission, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');
const { pattern: receiptPattern } = require('../utils/robotriqFeeReceipt');

const admin = requireRobotriqRole('Admin');
const manageAccounts = requireRobotriqPermission('accountsHub');
const staff = requireRobotriqRole('Employee', 'Manager', 'Sales');
const manageExpenses = requireRobotriqSalesPermission('salesExpenses');
const activeExpenses = { tenantId, voidedAt: null };
const statuses = ['Pending', 'Paid'];
const editableLedgerEntry = { $nor: [{ type: 'Income', desc: receiptPattern }, { feeReceipt: { $exists: true } }] };
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const sort = { date: -1, createdAt: -1, _id: -1 };

function entry(body, descriptionField) {
    const { date, amount } = body || {};
    const description = typeof body?.[descriptionField] === 'string' ? body[descriptionField].trim() : '';
    if (!description || description.length > 6000 || !Number.isFinite(amount) || amount <= 0 ||
        typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const day = new Date(date);
    if (!Number.isFinite(day.getTime()) || !day.toISOString().startsWith(date)) return null;
    return { [descriptionField]: description, date, amount };
}

function accountEntry(body) {
    const values = entry(body, 'desc');
    if (!values || !['Income', 'Expense'].includes(body.type) || !statuses.includes(body.status) ||
        (body.type === 'Income' && receiptPattern.test(values.desc))) return null;
    return { ...values, type: body.type, status: body.status };
}

const router = express.Router();
router.use(protect);
router.param('id', (req, res, next, id) => {
    if (!objectId(id)) return res.status(404).json({ message: 'Entry not found.' });
    next();
});

router.get('/accounts', manageAccounts, async (req, res) => {
    res.json(await Account.find({ tenantId }).sort(sort).lean());
});

router.post('/accounts', manageAccounts, async (req, res) => {
    const values = accountEntry(req.body);
    if (!values) return res.status(400).json({ message: 'Enter a valid ledger entry. Use Student Receipts for fee payments.' });
    res.status(201).json(await Account.create({ ...values, tenantId }));
});

router.put('/accounts/:id', manageAccounts, async (req, res) => {
    const values = accountEntry(req.body);
    if (!values) return res.status(400).json({ message: 'Enter a valid ledger entry.' });
    const saved = await Account.findOneAndUpdate({ tenantId, _id: req.params.id, ...editableLedgerEntry },
        { $set: values }, { new: true, runValidators: true });
    if (!saved) return res.status(404).json({ message: 'Editable ledger entry not found.' });
    res.json(saved);
});

router.delete('/accounts/:id', admin, async (req, res) => {
    const removed = await Account.findOneAndDelete({ tenantId, _id: req.params.id, ...editableLedgerEntry });
    if (!removed) return res.status(404).json({ message: 'Editable ledger entry not found.' });
    res.sendStatus(204);
});

router.get('/expenses', manageExpenses, async (req, res) => {
    const [expenses, staffOptions] = await Promise.all([
        Expense.find(activeExpenses).sort(sort).lean(),
        User.find({ tenantId, isActive: true, role: { $in: ['Employee', 'Manager', 'Sales'] } })
            .select('name').sort({ name: 1 }).lean()
    ]);
    res.json({ expenses, staff: staffOptions });
});

async function createExpense(req, res, employeeId, type) {
    const values = entry(req.body, 'description');
    if (!values || !objectId(employeeId) || !['Expense', 'Allocation'].includes(type)) {
        return res.status(400).json({ message: 'Enter complete expense details.' });
    }
    const user = await User.findOne({ _id: employeeId, tenantId, isActive: true,
        role: { $in: ['Employee', 'Manager', 'Sales'] } }).select('name').lean();
    if (!user) return res.status(404).json({ message: 'Robotriq staff member not found.' });
    const saved = await Expense.create({ ...values, tenantId, employeeId, employeeName: user.name, type, status: 'Pending' });
    res.status(201).json(saved);
}

router.post('/expenses', manageExpenses, (req, res) => createExpense(req, res, req.body?.employeeId, req.body?.type));

router.patch('/expenses/:id/status', admin, async (req, res) => {
    if (!statuses.includes(req.body?.status)) return res.status(400).json({ message: 'Invalid expense status.' });
    const saved = await Expense.findOneAndUpdate({ ...activeExpenses, _id: req.params.id },
        { $set: { status: req.body.status } }, { new: true, runValidators: true });
    if (!saved) return res.status(404).json({ message: 'Expense not found.' });
    res.json(saved);
});

router.delete('/expenses/:id', manageExpenses, async (req, res) => {
    const removed = await Expense.updateOne({ ...activeExpenses, _id: req.params.id },
        { $set: { voidedAt: new Date(), voidedBy: req.user.userId } });
    if (!removed.matchedCount) return res.status(404).json({ message: 'Expense not found.' });
    res.sendStatus(204);
});

router.get('/my-expenses', staff, async (req, res) => {
    res.json(await Expense.find({ ...activeExpenses, employeeId: req.user.userId }).sort(sort).lean());
});

router.post('/my-expenses', staff, (req, res) => createExpense(req, res, req.user.userId, 'Expense'));

module.exports = router;
