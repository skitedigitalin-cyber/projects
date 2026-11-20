const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Tenant = require('../models/Tenant');

exports.getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ tenantId: req.user.tenantId })
            .populate('customerId', 'customerName companyName customerId email phone billingAddress shippingAddress gstNumber panNumber')
            .sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        // Enforce Free Trial limits (Max 25 invoices during 30-day trial)
        const tenant = await Tenant.findById(req.user.tenantId);
        if (tenant && tenant.status === 'trial') {
            const currentInvoiceCount = await Invoice.countDocuments({ tenantId: req.user.tenantId });
            const maxAllowed = tenant.maxInvoices || 25;
            if (currentInvoiceCount >= maxAllowed) {
                return res.status(403).json({ 
                    message: `30-Day Free Trial limit reached! You can generate up to ${maxAllowed} invoices on the free trial. Please upgrade to generate more invoices.` 
                });
            }
        }

        const invoice = new Invoice({ ...req.body, tenantId: req.user.tenantId });
        await invoice.save();
        
        // Update Customer Total
        const customer = await Customer.findById(invoice.customerId);
        if(customer) {
            customer.totalInvoiceAmount += invoice.grandTotal;
            if (invoice.paymentStatus === 'Paid') {
                customer.paidAmount += invoice.grandTotal;
            }
            await customer.save();
        }

        // Auto-create Payment record if paid
        if (invoice.paymentStatus === 'Paid') {
            const Payment = require('../models/Payment');
            const payment = new Payment({
                tenantId: req.user.tenantId,
                paymentType: 'Inward',
                category: 'Customer Payment',
                customerId: invoice.customerId,
                invoiceId: invoice._id,
                amount: invoice.grandTotal,
                paymentDate: invoice.invoiceDate || new Date(),
                paymentMode: 'Bank Transfer', // Defaulting since we don't capture mode on Invoice UI
                notes: `Auto-generated for Invoice ${invoice.invoiceNumber || ''}`
            });
            await payment.save();
        }

        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const oldStatus = invoice.paymentStatus;
        const oldTotal = invoice.grandTotal;

        Object.assign(invoice, req.body);
        await invoice.save();

        if (oldTotal !== invoice.grandTotal) {
            const customer = await Customer.findById(invoice.customerId);
            if (customer) {
                customer.totalInvoiceAmount += (invoice.grandTotal - oldTotal);
                await customer.save();
            }
        }

        if (oldStatus !== 'Paid' && invoice.paymentStatus === 'Paid') {
            const Payment = require('../models/Payment');
            const customer = await Customer.findById(invoice.customerId);
            if (customer) {
                customer.paidAmount += invoice.grandTotal;
                await customer.save();
            }
            const payment = new Payment({
                tenantId: req.user.tenantId,
                paymentType: 'Inward',
                category: 'Customer Payment',
                customerId: invoice.customerId,
                invoiceId: invoice._id,
                amount: invoice.grandTotal,
                paymentDate: new Date(),
                paymentMode: 'Bank Transfer',
                notes: `Auto-generated from Status Edit: Invoice ${invoice.invoiceNumber}`
            });
            await payment.save();
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Record payment against an invoice (Supports partial & full payments)
exports.updatePayment = async (req, res) => {
    try {
        const { paidAmount, lastPaymentDate, lastPaymentAmount, paymentMode, notes } = req.body;
        const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const newPaid = Number(paidAmount);
        if (isNaN(newPaid) || newPaid < 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        invoice.paidAmount = newPaid;
        invoice.lastPaymentDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date();

        if (newPaid >= invoice.grandTotal && invoice.grandTotal > 0) {
            invoice.paymentStatus = 'Paid';
        } else if (newPaid > 0) {
            invoice.paymentStatus = 'Partial';
        } else {
            invoice.paymentStatus = 'Unpaid';
        }

        if (lastPaymentAmount) {
            if (!invoice.payments) invoice.payments = [];
            invoice.payments.push({
                amount: Number(lastPaymentAmount),
                paymentDate: invoice.lastPaymentDate,
                paymentMode: paymentMode || 'Bank Transfer',
                notes: notes || ''
            });

            // Also record in Payment model for Finance ledger
            try {
                const Payment = require('../models/Payment');
                const payment = new Payment({
                    tenantId: req.user.tenantId,
                    paymentType: 'Inward',
                    category: 'Customer Payment',
                    customerId: invoice.customerId,
                    invoiceId: invoice._id,
                    amount: Number(lastPaymentAmount),
                    paymentDate: invoice.lastPaymentDate,
                    paymentMode: paymentMode || 'Bank Transfer',
                    notes: notes || `Payment for Invoice ${invoice.invoiceNumber || ''}`
                });
                await payment.save();
            } catch (err) {
                console.warn('Payment model sync skipped:', err.message);
            }
        }

        await invoice.save();

        // Update customer totals
        if (invoice.customerId) {
            const allCustInvoices = await Invoice.find({ tenantId: req.user.tenantId, customerId: invoice.customerId });
            const custTotalBilled = allCustInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
            const custTotalPaid = allCustInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
            await Customer.findByIdAndUpdate(invoice.customerId, {
                $set: {
                    totalInvoiceAmount: custTotalBilled,
                    paidAmount: custTotalPaid,
                    pendingAmount: custTotalBilled - custTotalPaid
                }
            });
        }

        res.json({
            success: true,
            invoice
        });
    } catch (error) {
        console.error('Error updating invoice payment:', error);
        res.status(500).json({ message: 'Server error updating payment' });
    }
};

// Update last payment date
exports.updateLastPaymentDate = async (req, res) => {
    try {
        const { date } = req.body;
        const invoice = await Invoice.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            { $set: { lastPaymentDate: new Date(date) } },
            { new: true }
        );
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ success: true, invoice });
    } catch (error) {
        console.error('Error updating payment date:', error);
        res.status(500).json({ message: 'Server error updating payment date' });
    }
};

// PUT /api/invoices/:id/payment/:paymentIndex/date
exports.updateInvoicePaymentDate = async (req, res) => {
    try {
        const { date } = req.body;
        const { id, paymentIndex } = req.params;
        const invoice = await Invoice.findOne({ _id: id, tenantId: req.user.tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const idx = parseInt(paymentIndex, 10);
        if (invoice.payments && invoice.payments[idx]) {
            invoice.payments[idx].paymentDate = new Date(date);
            if (idx === invoice.payments.length - 1) {
                invoice.lastPaymentDate = new Date(date);
            }
        } else {
            invoice.lastPaymentDate = new Date(date);
        }
        await invoice.save();
        res.json({ success: true, invoice });
    } catch (error) {
        console.error('Error updating invoice payment date:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/invoices/:id/payment/:paymentIndex
exports.deleteInvoicePayment = async (req, res) => {
    try {
        const { id, paymentIndex } = req.params;
        const invoice = await Invoice.findOne({ _id: id, tenantId: req.user.tenantId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const idx = parseInt(paymentIndex, 10);
        if (invoice.payments && invoice.payments[idx]) {
            const removedAmount = invoice.payments[idx].amount || 0;
            invoice.payments.splice(idx, 1);
            invoice.paidAmount = Math.max((invoice.paidAmount || 0) - removedAmount, 0);

            if (invoice.paidAmount <= 0) {
                invoice.paymentStatus = 'Unpaid';
            } else if (invoice.paidAmount >= invoice.grandTotal) {
                invoice.paymentStatus = 'Paid';
            } else {
                invoice.paymentStatus = 'Partial';
            }

            if (invoice.payments.length > 0) {
                invoice.lastPaymentDate = invoice.payments[invoice.payments.length - 1].paymentDate;
            } else {
                invoice.lastPaymentDate = null;
            }

            await invoice.save();

            if (invoice.customerId) {
                const Customer = require('../models/Customer');
                const customer = await Customer.findById(invoice.customerId);
                if (customer) {
                    customer.paidAmount = Math.max((customer.paidAmount || 0) - removedAmount, 0);
                    await customer.save();
                }
            }

            res.json({ success: true, invoice });
        } else {
            res.status(400).json({ message: 'Payment entry not found' });
        }
    } catch (error) {
        console.error('Error deleting invoice payment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
