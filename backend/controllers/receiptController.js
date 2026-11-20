const Receipt = require('../models/Receipt');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// GET /api/receipts
exports.getReceipts = async (req, res) => {
    try {
        const receipts = await Receipt.find({ tenantId: req.user.tenantId })
            .populate('customerId', 'customerName companyName email phone billingAddress gstNumber panNumber')
            .populate('invoiceId', 'invoiceNumber grandTotal totalAmount invoiceDate paymentStatus')
            .sort({ receiptDate: -1, createdAt: -1 });
        res.json(receipts);
    } catch (error) {
        console.error('getReceipts error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// GET /api/receipts/:id
exports.getReceiptById = async (req, res) => {
    try {
        const receipt = await Receipt.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
            .populate('customerId', 'customerName companyName email phone billingAddress gstNumber panNumber')
            .populate('invoiceId', 'invoiceNumber grandTotal totalAmount invoiceDate items paymentStatus');
        if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
        res.json(receipt);
    } catch (error) {
        console.error('getReceiptById error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// POST /api/receipts
exports.createReceipt = async (req, res) => {
    try {
        const {
            customerId,
            invoiceId,
            amount,
            receiptDate,
            paymentMode,
            transactionId,
            notes
        } = req.body;

        if (!customerId) {
            return res.status(400).json({ message: 'Customer is required to issue a payment receipt' });
        }
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }

        const dateVal = receiptDate ? new Date(receiptDate) : new Date();
        const year = dateVal.getFullYear();
        
        // Count existing receipts for this tenant to generate sequential RCP-YYYY-XXXX
        const count = await Receipt.countDocuments({ tenantId: req.user.tenantId });
        const receiptNumber = `RCP-${year}-${(count + 1).toString().padStart(4, '0')}`;

        // Create Receipt
        const receipt = new Receipt({
            tenantId: req.user.tenantId,
            receiptNumber,
            customerId,
            invoiceId: invoiceId || undefined,
            amount: Number(amount),
            receiptDate: dateVal,
            paymentMode: paymentMode || 'Bank Transfer',
            transactionId: transactionId || '',
            notes: notes || '',
            status: 'Received'
        });

        // Also log to Payment (cashflow) so overall business revenue is in sync
        try {
            const payment = new Payment({
                tenantId: req.user.tenantId,
                paymentType: 'Inward',
                category: 'Customer Receipt',
                customerId,
                invoiceId: invoiceId || undefined,
                amount: Number(amount),
                paymentDate: dateVal,
                paymentMode: paymentMode || 'Bank Transfer',
                transactionId: transactionId || '',
                receiptNumber,
                notes: notes ? `[Receipt ${receiptNumber}] ${notes}` : `Client Payment Receipt ${receiptNumber}`
            });
            await payment.save();
            receipt.paymentRefId = payment._id;
        } catch (paymentErr) {
            console.warn('Failed to sync to Payment collection (non-fatal):', paymentErr);
        }

        await receipt.save();

        // Update Customer paidAmount
        try {
            const customer = await Customer.findById(customerId);
            if (customer) {
                customer.paidAmount = (customer.paidAmount || 0) + Number(amount);
                await customer.save();
            }
        } catch (custErr) {
            console.warn('Failed to update customer balance:', custErr);
        }

        // If linked to an invoice, check if invoice should be marked Paid
        if (invoiceId) {
            try {
                const invoice = await Invoice.findById(invoiceId);
                if (invoice) {
                    const invoiceTotal = Number(invoice.grandTotal || invoice.totalAmount || 0);
                    // Check all receipts linked to this invoice
                    const totalReceivedForInvoice = await Receipt.aggregate([
                        { $match: { invoiceId: invoice._id, tenantId: req.user.tenantId } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ]);
                    const currentSum = totalReceivedForInvoice.length > 0 ? totalReceivedForInvoice[0].total : Number(amount);
                    if (currentSum >= invoiceTotal) {
                        invoice.paymentStatus = 'Paid';
                    } else if (currentSum > 0) {
                        invoice.paymentStatus = 'Partially Paid';
                    }
                    await invoice.save();
                }
            } catch (invErr) {
                console.warn('Failed to update invoice status:', invErr);
            }
        }

        // Return populated receipt
        const populatedReceipt = await Receipt.findById(receipt._id)
            .populate('customerId', 'customerName companyName email phone billingAddress gstNumber panNumber')
            .populate('invoiceId', 'invoiceNumber grandTotal totalAmount invoiceDate paymentStatus');

        res.status(201).json(populatedReceipt);
    } catch (error) {
        console.error('createReceipt error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// DELETE /api/receipts/:id
exports.deleteReceipt = async (req, res) => {
    try {
        const receipt = await Receipt.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

        // Reverse customer's paid amount
        if (receipt.customerId) {
            try {
                const customer = await Customer.findById(receipt.customerId);
                if (customer) {
                    customer.paidAmount = Math.max((customer.paidAmount || 0) - receipt.amount, 0);
                    await customer.save();
                }
            } catch (custErr) {
                console.warn('Failed to revert customer balance:', custErr);
            }
        }

        // Delete linked Payment record if any
        if (receipt.paymentRefId) {
            try {
                await Payment.findByIdAndDelete(receipt.paymentRefId);
            } catch (payErr) {
                console.warn('Failed to delete linked payment record:', payErr);
            }
        }

        res.json({ success: true, message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('deleteReceipt error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
