const express = require('express');
const Customer = require('../models/RobotriqCustomer');
const User = require('../models/User');
const Bom = require('../models/RobotriqBom');
const Quote = require('../models/RobotriqSalesQuote');
const AdminQuote = require('../models/Quote');
const { SalesLead, DirectEnquiry } = require('../models/RobotriqEnquiry');
const protect = require('../middleware/authMiddleware');
const nextNumber = require('../utils/nextRobotriqNumber');
const { tenantId, requireRobotriqRole, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');
const { payrollDay } = require('../utils/robotriqPayroll');

const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const statuses = ['New', 'BOM Created', 'BOM created', 'Quotation Created', 'Advance required', 'Material required',
    'PO Received', 'Proforma Invoice Created', 'Advance Received', 'Work in progress', 'Work Completed',
    'Sale Created', 'Full Payment Received'];
const types = ['', 'service', 'material', 'project', 'panel'];
const priorities = ['Low', 'Medium', 'High'];
const textFields = ['customerName', 'companyName', 'phone', 'email', 'application', 'reference', 'enquiryDetails'];
const dates = ['enquiryDate', 'commitmentDate', 'saleCreatedDate'];

function parseDetails(body, existing = null) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const details = {};
    for (const field of textFields) {
        if (typeof body[field] !== 'string' || body[field].length > 6000) return null;
        details[field] = body[field].trim();
    }
    if (!details.customerName || !types.includes(body.type) || !(statuses.includes(body.status) || body.status === existing?.status) ||
        !priorities.includes(body.priority)) return null;
    for (const field of ['customer', 'assignedEmployee']) {
        if (body[field] && !objectId(body[field])) return null;
        details[field] = body[field] || null;
    }
    for (const field of ['advancePayment', 'fullPayment']) {
        if (!Number.isFinite(body[field]) || body[field] < 0) return null;
        details[field] = body[field];
    }
    for (const field of dates) {
        const input = body[field];
        if (!input && field !== 'enquiryDate') {
            details[field] = null;
            continue;
        }
        if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
        const date = new Date(input);
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input) return null;
        details[field] = date;
    }
    if (!details.saleCreatedDate) {
        details.saleCreatedDate = existing?.saleCreatedDate || (body.status === 'Sale Created' ? new Date() : null);
    }
    return { ...details, status: body.status, type: body.type, priority: body.priority };
}

async function validLinks(fields, existing) {
    const checks = [];
    if (fields.customer && fields.customer !== String(existing?.customer || '')) {
        checks.push(Customer.exists({ _id: fields.customer, tenantId }));
    }
    if (fields.assignedEmployee && fields.assignedEmployee !== String(existing?.assignedEmployee || '')) {
        checks.push(User.exists({ _id: fields.assignedEmployee, tenantId, isActive: true }));
    }
    return (await Promise.all(checks)).every(Boolean);
}

const accountFields = 'enquiryId customerName companyName phone fullPayment advancePayment commitmentDate saleCreatedDate accountCompleted accountCompletedDate status createdAt updatedAt';
const accountScope = { tenantId, status: 'Sale Created' };

async function completeAccount(req, res, fields) {
    const filter = { ...accountScope, _id: req.params.id };
    const version = req.body?.updatedAt;
    const date = typeof version === 'string' ? new Date(version) : null;
    if (fields && version !== null && (!date || !Number.isFinite(date.getTime()) || date.toISOString() !== version)) {
        return res.status(400).json({ message: 'Reload this account before completing it.' });
    }
    const updated = await SalesLead.findOneAndUpdate({ ...filter, accountCompleted: { $ne: true },
        ...(fields && { updatedAt: date }) }, [
        { $set: { accountCompleted: true, accountCompletedDate: '$$NOW',
            advancePayment: { $ifNull: ['$fullPayment', 0] }, fullPayment: { $ifNull: ['$fullPayment', 0] } } }
    ], { returnDocument: 'after', updatePipeline: true }).select(fields);
    const completed = updated || await SalesLead.findOne({ ...filter, accountCompleted: true }).select(fields).lean();
    if (!completed) {
        if (fields && await SalesLead.exists(filter)) return res.status(409).json({ message: 'This account changed. Reload it before completing.' });
        return res.status(404).json({ message: 'Sale account not found.' });
    }
    res.json(completed);
}

function enquiryRouter(Model, prefix, direct) {
    const router = express.Router();
    const access = direct ? requireRobotriqRole('Admin') : requireRobotriqSalesPermission('salesLeads');
    const admin = requireRobotriqRole('Admin');
    const scope = { tenantId };
    const personal = req => !direct && ['Employee', 'Manager'].includes(req.robotriqStaffRole);
    const enquiryScope = req => personal(req) ? { ...scope, type: 'service', assignedEmployee: req.user.userId } : scope;
    router.use(protect);
    router.param('id', (req, res, next, id) => {
        if (!objectId(id)) return res.status(404).json({ message: 'Enquiry not found.' });
        next();
    });

    if (!direct) {
        const accounts = requireRobotriqSalesPermission('salesAccounts');
        router.get('/accounts', accounts, async (req, res) => {
            const enquiries = await SalesLead.find(accountScope).select(accountFields).sort({ saleCreatedDate: -1, createdAt: -1 }).lean();
            res.json({ enquiries, customers: [], staff: [] });
        });
        router.put('/accounts/:id', accounts, async (req, res) => {
            const { phone, fullPayment, advancePayment, commitmentDate, updatedAt = null } = req.body || {};
            if (typeof phone !== 'string' || phone.length > 6000 || !Number.isFinite(fullPayment) || fullPayment < 0 ||
                !Number.isFinite(advancePayment) || advancePayment < 0 || typeof commitmentDate !== 'string' ||
                payrollDay(commitmentDate) !== commitmentDate) {
                return res.status(400).json({ message: 'Enter a valid phone number, payment amounts and commitment date.' });
            }
            const scope = { ...accountScope, _id: req.params.id };
            const current = await SalesLead.findOne(scope).select('updatedAt accountCompleted fullPayment advancePayment').lean();
            if (!current) return res.status(404).json({ message: 'Sale account not found.' });
            if ((current.updatedAt?.toISOString() ?? null) !== updatedAt) {
                return res.status(409).json({ message: 'This account changed. Reload it before editing.' });
            }
            const values = { phone: phone.trim(), commitmentDate: commitmentDate ? new Date(commitmentDate) : null };
            if (current.accountCompleted) {
                if (fullPayment !== (current.fullPayment ?? 0) || advancePayment !== (current.advancePayment ?? 0)) {
                    return res.status(409).json({ message: 'Payment amounts are locked for completed accounts.' });
                }
            } else {
                Object.assign(values, { fullPayment, advancePayment });
            }
            const saved = await SalesLead.findOneAndUpdate({ ...scope, updatedAt: current.updatedAt ?? null,
                accountCompleted: current.accountCompleted ?? null }, { $set: values }, { returnDocument: 'after', runValidators: true })
                .select(accountFields);
            if (!saved) return res.status(409).json({ message: 'This account changed. Reload it before editing.' });
            res.json(saved);
        });
        router.post('/accounts/:id/complete', accounts, (req, res) => completeAccount(req, res, accountFields));
    }

    router.use(access);

    router.get('/', async (req, res) => {
        const [enquiries, customers, staff] = await Promise.all([
            Model.find(enquiryScope(req)).sort({ createdAt: -1, _id: -1 }).lean(),
            Customer.find(scope).select('customerName companyName email phone').sort({ customerName: 1 }).lean(),
            User.find({ ...scope, isActive: true, ...(personal(req) ? { _id: req.user.userId } : {}) })
                .select('name').sort({ name: 1 }).lean()
        ]);
        res.json({ enquiries, customers, staff });
    });

    router.post('/', async (req, res) => {
        const values = parseDetails(req.body);
        if (values && personal(req)) Object.assign(values, { type: 'service', assignedEmployee: req.user.userId });
        if (!values || !await validLinks(values)) {
            return res.status(400).json({ message: 'Enter valid enquiry details and select Robotriq records.' });
        }
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const enquiryId = await nextNumber(Model, 'enquiryId', prefix, direct ? 'direct-enquiries' : 'mine-power-enquiries', null);
                return res.status(201).json(await Model.create({ ...values, tenantId, enquiryId }));
            } catch (error) {
                if (error.code !== 11000 || attempt === 2) throw error;
            }
        }
    });

    router.put('/:id', async (req, res) => {
        const filter = { ...enquiryScope(req), _id: req.params.id };
        const existing = await Model.findOne(filter).lean();
        if (!existing) return res.status(404).json({ message: 'Enquiry not found.' });
        if ((req.body?.updatedAt ?? null) !== (existing.updatedAt?.toISOString() ?? null)) {
            return res.status(409).json({ message: 'This enquiry changed. Reload it before editing.' });
        }
        const values = parseDetails(req.body, existing);
        if (values && personal(req)) Object.assign(values, { type: 'service', assignedEmployee: req.user.userId });
        if (!values || !await validLinks(values, existing)) {
            return res.status(400).json({ message: 'Enter valid enquiry details and select Robotriq records.' });
        }
        if (existing.accountCompleted && (values.fullPayment !== existing.fullPayment ||
            values.advancePayment !== existing.advancePayment)) {
            return res.status(409).json({ message: 'Payment amounts are locked for completed accounts.' });
        }
        const updated = await Model.findOneAndUpdate({ ...filter, updatedAt: existing.updatedAt ?? { $exists: false } },
            { $set: values }, { new: true, runValidators: true });
        if (!updated) return res.status(409).json({ message: 'This enquiry changed. Reload it before editing.' });
        res.json(updated);
    });

    if (!direct) {
        router.post('/:id/complete-account', requireRobotriqRole('Admin', 'Sales'), (req, res) => completeAccount(req, res));
    }

    router.delete('/:id', admin, async (req, res) => {
        if (direct) {
            const used = await AdminQuote.exists({ ...scope, 'robotriqLink.kind': 'enquiry', 'robotriqLink.recordId': req.params.id });
            if (used) return res.status(409).json({ message: 'This enquiry is linked to a quotation.' });
        } else {
            const reference = { ...scope, lead: req.params.id };
            const dependencies = await Promise.all([Bom.exists(reference), Quote.exists(reference)]);
            if (dependencies.some(Boolean)) {
                return res.status(409).json({ message: 'This enquiry is linked to a BOM or quotation.' });
            }
        }
        const removed = await Model.findOneAndDelete({ ...scope, _id: req.params.id });
        if (!removed) return res.status(404).json({ message: 'Enquiry not found.' });
        res.sendStatus(204);
    });
    return router;
}

module.exports = {
    minePower: enquiryRouter(SalesLead, 'ENQ-', false),
    direct: enquiryRouter(DirectEnquiry, 'RQ-ENQ-', true)
};
