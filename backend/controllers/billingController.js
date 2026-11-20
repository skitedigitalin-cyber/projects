const Razorpay = require('razorpay');
const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const SystemSettings = require('../models/SystemSettings');

// Initialize Razorpay (Test credentials for now)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret'
});

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
        // Fetch global price from SystemSettings
        const priceSetting = await SystemSettings.findOne({ key: 'monthly_subscription_price' });
        const amountInRupees = priceSetting ? parseInt(priceSetting.value) : 1000; // default 1000 INR

        const options = {
            amount: amountInRupees * 100, // Amount in paise
            currency: 'INR',
            receipt: 'receipt_' + req.user.tenantId + '_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        
        res.status(200).json({
            orderId: order.id,
            amount: options.amount,
            currency: options.currency
        });
    } catch (error) {
        console.error('Razorpay Error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret')
            .update(body.toString())
            .digest('hex');

        // Note: For local dev with dummy keys, we'll bypass actual signature check if using completely fake keys
        // But if real test keys are provided in .env, it verifies perfectly.
        const isAuthentic = expectedSignature === razorpay_signature || process.env.RAZORPAY_KEY_ID === undefined;

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
