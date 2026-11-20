const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

exports.getCustomers = async (req, res) => {
    try {
        const tenantId = mongoose.Types.ObjectId.isValid(req.user.tenantId)
            ? new mongoose.Types.ObjectId(req.user.tenantId)
            : req.user.tenantId;

        const customers = await Customer.find({ tenantId })
            .sort({ totalInvoiceAmount: -1, createdAt: -1 })
            .lean();

        // Count invoices per customer for this tenant
        const invoiceCounts = await Invoice.aggregate([
            { $match: { tenantId } },
            { $group: { _id: '$customerId', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        invoiceCounts.forEach(c => {
            if (c._id) countMap[c._id.toString()] = c.count;
        });

        const enriched = customers.map(c => ({
            ...c,
            invoiceCount: countMap[c._id.toString()] || c.invoiceCount || 0
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const payload = { ...req.body };
        payload.creditLimit = Number(payload.creditLimit) || 0;
        payload.openingBalance = Number(payload.openingBalance) || 0;
        if (!payload.customerId) {
            payload.customerId = 'CUST-' + Math.floor(10000 + Math.random() * 90000);
        }
        
        const customer = new Customer({
            ...payload,
            tenantId: req.user.tenantId
        });
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        console.error("Create Customer Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        Object.assign(customer, req.body);
        await customer.save(); // triggers pre-save hook to update pending amount

        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json({ message: 'Customer removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
