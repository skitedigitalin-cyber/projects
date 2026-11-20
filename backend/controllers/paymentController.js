const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');

exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ tenantId: req.user.tenantId })
            .populate('customerId', 'customerName companyName email phone billingAddress gstNumber panNumber')
            .populate('vendorId', 'vendorName companyName email phone')
            .populate('invoiceId', 'invoiceNumber grandTotal invoiceDate')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('customerId', 'customerName companyName email phone billingAddress gstNumber panNumber')
            .populate('vendorId', 'vendorName companyName email phone')
            .populate('invoiceId', 'invoiceNumber grandTotal invoiceDate items');
        if (!payment) return res.status(404).json({ message: 'Payment receipt not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createPayment = async (req, res) => {
    try {
        const payment = new Payment({ ...req.body, tenantId: req.user.tenantId });
        await payment.save();
        
        if (payment.paymentType === 'Inward' && payment.customerId) {
            const customer = await Customer.findById(payment.customerId);
            if (customer) {
                customer.paidAmount += payment.amount;
                await customer.save();
            }
        } else if (payment.paymentType === 'Outward' && payment.vendorId) {
            const vendor = await Vendor.findById(payment.vendorId);
            if (vendor) {
                vendor.amountPaid += payment.amount;
                await vendor.save();
            }
        }

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// PUT /api/payments/:id/date
exports.updatePaymentDate = async (req, res) => {
    try {
        const { date } = req.body;
        const payment = await Payment.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            { $set: { paymentDate: new Date(date) } },
            { new: true }
        );
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// DELETE /api/payments/:id
exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        // Reverse customer or vendor amount if applicable
        if (payment.paymentType === 'Inward' && payment.customerId) {
            const customer = await Customer.findById(payment.customerId);
            if (customer) {
                customer.paidAmount = Math.max((customer.paidAmount || 0) - payment.amount, 0);
                await customer.save();
            }
        } else if (payment.paymentType === 'Outward' && payment.vendorId) {
            const vendor = await Vendor.findById(payment.vendorId);
            if (vendor) {
                vendor.amountPaid = Math.max((vendor.amountPaid || 0) - payment.amount, 0);
                await vendor.save();
            }
        }

        res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
