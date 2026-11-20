const Purchase = require('../models/Purchase');
const Vendor = require('../models/Vendor');

exports.getPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find({ tenantId: req.user.tenantId })
            .populate('vendorId', 'vendorName companyName vendorId')
            .sort({ createdAt: -1 });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createPurchase = async (req, res) => {
    try {
        const purchase = new Purchase({ ...req.body, tenantId: req.user.tenantId });
        await purchase.save();
        
        const vendor = await Vendor.findById(purchase.vendorId);
        if(vendor) {
            vendor.totalPurchaseAmount += purchase.grandTotal;
            if (purchase.paymentStatus === 'Paid') {
                vendor.amountPaid += purchase.grandTotal;
            }
            await vendor.save();
        }

        // Auto-create Payment record if paid
        if (purchase.paymentStatus === 'Paid') {
            const Payment = require('../models/Payment');
            const payment = new Payment({
                tenantId: req.user.tenantId,
                paymentType: 'Outward',
                category: 'Vendor Payment',
                vendorId: purchase.vendorId,
                purchaseId: purchase._id,
                amount: purchase.grandTotal,
                paymentDate: purchase.billDate || new Date(),
                paymentMode: 'Bank Transfer',
                notes: `Auto-generated for Purchase Bill ${purchase.purchaseBillNumber || purchase.internalId}`
            });
            await payment.save();
        }

        res.status(201).json(purchase);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updatePurchase = async (req, res) => {
    try {
        const purchase = await Purchase.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

        const oldStatus = purchase.paymentStatus;
        const oldTotal = purchase.grandTotal;

        Object.assign(purchase, req.body);
        await purchase.save();

        if (oldTotal !== purchase.grandTotal) {
            const vendor = await Vendor.findById(purchase.vendorId);
            if (vendor) {
                vendor.totalPurchaseAmount += (purchase.grandTotal - oldTotal);
                await vendor.save();
            }
        }

        if (oldStatus !== 'Paid' && purchase.paymentStatus === 'Paid') {
            const Payment = require('../models/Payment');
            const vendor = await Vendor.findById(purchase.vendorId);
            if (vendor) {
                vendor.amountPaid += purchase.grandTotal;
                await vendor.save();
            }
            const payment = new Payment({
                tenantId: req.user.tenantId,
                paymentType: 'Outward',
                category: 'Vendor Payment',
                vendorId: purchase.vendorId,
                purchaseId: purchase._id,
                amount: purchase.grandTotal,
                paymentDate: new Date(),
                paymentMode: 'Bank Transfer',
                notes: `Auto-generated from Status Edit: Bill ${purchase.purchaseBillNumber}`
            });
            await payment.save();
        }

        res.json(purchase);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deletePurchase = async (req, res) => {
    try {
        const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
        res.json({ message: 'Purchase deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
