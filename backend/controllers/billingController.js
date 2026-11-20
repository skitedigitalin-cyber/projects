const Razorpay = require('razorpay');
const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const SystemSettings = require('../models/SystemSettings');
const Employee = require('../models/Employee');
const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');

const billingKeyId = process.env.RAZORPAY_KEY_ID;
const billingSecret = process.env.RAZORPAY_KEY_SECRET;
const checkoutAvailable = Boolean(billingKeyId && billingSecret && !/dummy|demo/i.test(billingKeyId));

// Initialize Razorpay (Test credentials for now)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret'
});

async function monthlyPrice() {
    const priceSetting = await SystemSettings.findOne({ key: 'monthly_subscription_price' });
    const value = parseInt(priceSetting?.value, 10);
    return Number.isSafeInteger(value) && value > 0 ? value : 1000;
}

exports.getBillingOverview = async (req, res) => {
    try {
        if (!['Admin', 'CEO'].includes(req.user.role)) return res.status(403).json({ message: 'Billing access requires an admin account' });
        const { tenantId } = req.user;
        const tenant = await Tenant.findById(tenantId).select('subscriptionPlan status validUntil maxEmployees maxLeads maxInvoices').lean();
        if (!tenant) return res.status(404).json({ message: 'Workspace not found' });
        const [price, employees, leads, invoices] = await Promise.all([
            monthlyPrice(),
            Employee.countDocuments({ tenantId, status: { $ne: 'Inactive' } }),
            Lead.countDocuments({ tenantId }),
            Invoice.countDocuments({ tenantId })
        ]);
        const hasAccess = ['trial', 'active'].includes(tenant.status) && tenant.validUntil > new Date();
        return res.json({
            plan: tenant.subscriptionPlan,
            status: hasAccess ? tenant.status : 'expired',
            validUntil: tenant.validUntil,
            monthlyPrice: price,
            checkoutAvailable,
            usage: [
                { label: 'Employees', used: employees, limit: tenant.maxEmployees },
                { label: 'Leads', used: leads, limit: tenant.maxLeads },
                { label: 'Invoices', used: invoices, limit: tenant.maxInvoices }
            ]
        });
    } catch (error) {
        console.error('Billing overview unavailable:', error.message);
        return res.status(500).json({ message: 'Could not load billing details' });
    }
};

exports.createRegistrationOrder = async (req, res) => {
    try {
        const { plan = 'Growth', billingCycle = 'monthly' } = req.body;
        
        let amountInRupees = 1499;
        if (plan === 'Growth') {
            amountInRupees = billingCycle === 'annual' ? 1199 : 1499;
        } else if (plan === 'Enterprise') {
            amountInRupees = billingCycle === 'annual' ? 3199 : 3999;
        }

        const amountInPaise = amountInRupees * 100;
        const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id';
        const isLiveOrTestConfigured = keyId && !keyId.includes('dummy') && !keyId.includes('demo') && !keyId.includes('skite');

        let orderId = 'order_reg_' + Date.now();
        if (isLiveOrTestConfigured) {
            try {
                const order = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: 'rcpt_reg_' + Date.now()
                });
                orderId = order.id;
            } catch (rErr) {
                console.warn('Razorpay SDK order call failed, using local test order:', rErr.message);
            }
        }

        res.status(200).json({
            orderId,
            amount: amountInPaise,
            amountInRupees,
            currency: 'INR',
            keyId: isLiveOrTestConfigured ? keyId : null
        });
    } catch (error) {
        console.error('Error creating registration order:', error);
        res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        if (!checkoutAvailable) return res.status(503).json({ message: 'Checkout is currently unavailable' });
        const amountInRupees = await monthlyPrice();

        const options = {
            amount: amountInRupees * 100, // Amount in paise
            currency: 'INR',
            receipt: 'receipt_' + req.user.tenantId + '_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        
        res.status(200).json({
            orderId: order.id,
            amount: options.amount,
            currency: options.currency,
            keyId: billingKeyId
        });
    } catch (error) {
        console.error('Razorpay Error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        if (!checkoutAvailable) return res.status(503).json({ message: 'Payment verification is currently unavailable' });
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', billingSecret)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update Tenant Subscription
            const tenant = await Tenant.findById(req.user.tenantId);
            tenant.status = 'active';
            // Extend validity by 30 days
            const now = new Date();
            if (tenant.validUntil && tenant.validUntil > now) {
                tenant.validUntil = new Date(tenant.validUntil.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
                tenant.validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            }
            tenant.lastPaymentId = razorpay_payment_id;
            await tenant.save();

            res.status(200).json({ message: 'Payment verified successfully', tenant });
        } else {
            res.status(400).json({ message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ message: 'Server error verifying payment' });
    }
};
