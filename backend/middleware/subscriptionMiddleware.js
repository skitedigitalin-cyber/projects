const Tenant = require('../models/Tenant');

const checkSubscription = async (req, res, next) => {
    try {
        // Skip for CEO
        if (req.user && req.user.role === 'CEO') {
            return next();
        }

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        // Check if active or trial is still valid
        const now = new Date();
        if (tenant.status === 'active' && tenant.validUntil && tenant.validUntil > now) {
            return next();
        }

        if (tenant.status === 'trial' && tenant.validUntil && tenant.validUntil > now) {
            return next();
        }

        // Expired
        tenant.status = 'expired';
        await tenant.save();

        return res.status(402).json({ message: 'Subscription expired. Payment required.', redirect: '/billing' });
    } catch (error) {
        console.error('Subscription Check Error:', error);
        return res.status(500).json({ message: 'Server error checking subscription' });
    }
};

module.exports = checkSubscription;
