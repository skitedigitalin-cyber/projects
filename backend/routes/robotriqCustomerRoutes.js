const express = require('express');
const Customer = require('../models/RobotriqCustomer');
const Quote = require('../models/Quote');
const { SalesLead, DirectEnquiry } = require('../models/RobotriqEnquiry');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const admin = requireRobotriqRole('Admin');
const sales = requireRobotriqSalesPermission('salesCustomers');
const fields = ['companyName', 'customerName', 'phone', 'email', 'gstNo', 'address'];

function customerFields(body) {
    const result = Object.fromEntries(fields.map(field => [
        field, typeof body?.[field] === 'string' ? body[field].trim() : ''
    ]));
    result.customerName ||= result.companyName;
    return result;
}

router.use(protect);

router.get('/', sales, async (req, res) => {
    res.json(await Customer.find({ tenantId }).select(fields.join(' ')).sort({ createdAt: -1 }).lean());
});

router.post('/', sales, async (req, res) => {
    const customer = customerFields(req.body);
    if (!customer.customerName) return res.status(400).json({ message: 'Enter a customer or company name.' });
    res.status(201).json(await Customer.create({ ...customer, tenantId }));
});

router.param('id', (req, res, next, id) => {
    if (!/^[a-f0-9]{24}$/i.test(id)) return res.status(404).json({ message: 'Customer not found.' });
    next();
});

router.put('/:id', sales, async (req, res) => {
    const customer = customerFields(req.body);
    if (!customer.customerName) return res.status(400).json({ message: 'Enter a customer or company name.' });
    const updated = await Customer.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: customer },
        { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Customer not found.' });
    res.json(updated);
});

router.delete('/:id', admin, async (req, res) => {
    const reference = { tenantId, customer: req.params.id };
    const linked = await Promise.all([
        SalesLead.exists(reference), DirectEnquiry.exists(reference),
        Quote.exists({ tenantId, 'robotriqLink.kind': 'customer', 'robotriqLink.recordId': req.params.id })
    ]);
    if (linked.some(Boolean)) return res.status(409).json({ message: 'This customer is linked to an enquiry or quotation.' });
    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'Customer not found.' });
    res.sendStatus(204);
});

module.exports = router;
