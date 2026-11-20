const Tenant = require('../models/Tenant');
const User = require('../models/User');

const monthKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});
const validMonth = value => typeof value === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value);
const authorized = user => ['Admin', 'CEO'].includes(user.role) && User.exists({
    _id: user.userId, tenantId: user.tenantId, role: { $in: ['Admin', 'CEO'] }, isActive: { $ne: false }
});
const targetEntry = (tenant, month) => {
    const targets = tenant?.monthlySalesTargets;
    return (targets instanceof Map ? targets.get(month) : targets?.[month]) ?? null;
};

exports.getDashboardTarget = async (tenantId, now, collections) => {
    const month = monthKey.format(now).slice(0, 7);
    const tenant = await Tenant.findById(tenantId).select('monthlySalesTargets').lean();
    const target = targetEntry(tenant, month);
    const prior = targetEntry(tenant, collections.previousMonth);
    return {
        month,
        target,
        collected: collections.collected,
        previousProgress: prior > 0 ? Math.round(collections.previousCollected / prior * 100) : null
    };
};

exports.getSalesTarget = async (req, res) => {
    try {
        if (!await authorized(req.user)) return res.status(403).json({ message: 'Workspace admin access required' });
        const month = req.query.month ?? monthKey.format(new Date()).slice(0, 7);
        if (!validMonth(month)) return res.status(400).json({ message: 'Choose a valid month' });
        const tenant = await Tenant.findById(req.user.tenantId).select('monthlySalesTargets').lean();
        if (!tenant) return res.status(404).json({ message: 'Workspace not found' });
        return res.json({ month, target: targetEntry(tenant, month) });
    } catch {
        return res.status(500).json({ message: 'Could not load the sales target' });
    }
};

exports.updateSalesTarget = async (req, res) => {
    try {
        if (!await authorized(req.user)) return res.status(403).json({ message: 'Workspace admin access required' });
        const { month, target } = req.body;
        if (!validMonth(month) || (target !== null && (!Number.isSafeInteger(target) || target <= 0))) {
            return res.status(400).json({ message: 'Choose a valid month and a whole rupee amount above zero' });
        }
        const path = `monthlySalesTargets.${month}`;
        const update = target === null ? { $unset: { [path]: 1 } } : { $set: { [path]: target } };
        const result = await Tenant.updateOne({ _id: req.user.tenantId }, update);
        if (!result.matchedCount) return res.status(404).json({ message: 'Workspace not found' });
        return res.json({ month, target });
    } catch {
        return res.status(500).json({ message: 'Could not save the sales target' });
    }
};
