const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

// Get overview stats for main dashboard
const summarizeCollections = require('../utils/dashboardCollections');
const summarizePipeline = require('../utils/dashboardPipeline');
const loadDashboardTeam = require('../utils/dashboardTeam');
const { getDashboardTarget } = require('./salesTargetController');
const { conversionChange, countMonthlyWins, countPeriodWins } = require('../utils/leadConversions');

exports.getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const leads = await Lead.find({ tenantId }).sort({ createdAt: -1 });
        const invoices = await Invoice.find({ tenantId }).sort({ createdAt: -1 });

        // Total pipeline value from active leads (not lost)
        const totalPipelineValue = leads.reduce((sum, l) => {
            if (l.leadStatus !== 'Lost') {
                return sum + (Number(l.leadValue) || 0);
            }
            return sum;
        }, 0);

        // Active leads count (excluding converted and lost)
        const activeLeadsCount = leads.filter(l => l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost').length;
        const totalLeadsCount = leads.length;

        // Pending follow-ups & callback calls
        const now = new Date();
        const pendingCalls = leads.filter(l => {
            if (l.leadStatus === 'Converted' || l.leadStatus === 'Lost') return false;
            if (l.callbackAlertDate) {
                const dt = new Date(`${l.callbackAlertDate}T${l.callbackAlertTime || '00:00'}`);
                if (dt <= now) return true;
            }
            if (l.nextFollowUpDate && new Date(l.nextFollowUpDate) <= now) return true;
            if (l.callStatus && (l.callStatus.includes('Callback') || l.callStatus === 'Not Attend')) return true;
            return false;
        }).length;

        // Escalations / Overdue items
        const escalationsCount = leads.filter(l => {
            if (l.leadStatus === 'Converted' || l.leadStatus === 'Lost') return false;
            if (l.nextFollowUpDate && new Date(l.nextFollowUpDate) < now) return true;
            if (l.callStatus === 'Not Attend' || (l.callStatus && l.callStatus.includes('Callback (4)')) || (l.callStatus && l.callStatus.includes('Callback (5)'))) return true;
            return false;
        }).length;

        // Pipeline Health Breakdown
        const hotCount = leads.filter(l => l.leadTemperature === 'Hot').length;
        const warmCount = leads.filter(l => l.leadTemperature === 'Warm').length;
        const coldCount = leads.filter(l => l.leadTemperature === 'Cold' || !l.leadTemperature).length;

        const highIntentPct = totalLeadsCount > 0 ? Math.round((hotCount / totalLeadsCount) * 100) : 0;
        const nurturePct = totalLeadsCount > 0 ? Math.round((warmCount / totalLeadsCount) * 100) : 0;
        const discoveryPct = totalLeadsCount > 0 ? Math.round((coldCount / totalLeadsCount) * 100) : 0;

        const convertedCount = leads.filter(l => l.leadStatus === 'Converted').length;
        const conversionRate = totalLeadsCount > 0 ? ((convertedCount / totalLeadsCount) * 100).toFixed(1) : 0;

        // Recent Deals / Live Deal Feed (recent 5 leads)
        const recentLeads = leads.slice(0, 5).map(l => ({
            _id: l._id,
            customerName: l.customerName,
            companyName: l.companyName || 'Individual',
            leadSource: l.leadSource || 'Direct',
            leadStatus: l.leadStatus || 'New',
            leadValue: l.leadValue || 0,
            createdAt: l.createdAt,
            initials: (l.customerName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        }));

        const collections = ['Admin', 'CEO'].includes(req.user.role) ? summarizeCollections(invoices, now) : undefined;
        const [overview, salesTarget] = collections
            ? await Promise.all([loadDashboardTeam(tenantId, now, collections.revenue.at(-1).invoiced).catch(error => {
                console.error('Dashboard overview unavailable:', error.message);
                return undefined;
            }), getDashboardTarget(tenantId, now, collections).catch(error => {
                console.error('Sales target unavailable:', error.message);
                return undefined;
            })])
            : [];

        res.json({
            totalPipelineValue,
            activeLeadsCount,
            totalLeadsCount,
            actionItemsCount: pendingCalls,
            pendingCallsCount: pendingCalls,
            escalationsCount,
            pipelineHealth: {
                highIntentPct,
                nurturePct,
                discoveryPct,
                hotCount,
                warmCount,
                coldCount
            },
            conversionRate,
            convertedCount,
            monthlyWins: countMonthlyWins(leads, now),
            periodWins: countPeriodWins(leads, now),
            ...summarizePipeline(leads, now),
            collections,
            overview,
            salesTarget,
            recentLeads
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        res.status(500).json({ message: 'Server Error fetching dashboard stats' });
    }
};

exports.getMyFollowUps = async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const allowed = await User.exists({ _id: userId, tenantId, isActive: true, activeModules: 'sales' });
        if (!allowed) return res.status(403).json({ message: 'Sales access required' });

        const leads = await Lead.find({ tenantId, assignedSalesperson: userId })
            .select('companyName customerName leadStatus callbackAlertDate callbackAlertTime nextFollowUpDate mobileNumber')
            .lean();
        const phones = new Map(leads.map(lead => [String(lead._id), lead.mobileNumber]));
        const { followUps, followUpCount, overdueFollowUpCount } = summarizePipeline(leads, new Date());
        return res.json({
            followUps: followUps.map(item => ({ ...item, phone: phones.get(String(item.id)) })),
            followUpCount,
            overdueFollowUpCount
        });
    } catch (error) {
        console.error('Assigned follow-ups unavailable:', error.message);
        return res.status(500).json({ message: 'Could not load follow-ups' });
    }
};

const isLeadManager = user => ['Admin', 'CEO'].includes(user.role);
const ownerFilter = tenantId => ({
    tenantId,
    isActive: true,
    $or: [{ role: { $in: ['Admin', 'CEO'] } }, { activeModules: 'sales' }]
});

exports.getLeadOwners = async (req, res) => {
    if (!isLeadManager(req.user)) return res.status(403).json({ message: 'Lead owner management requires an admin account' });
    try {
        const owners = await User.find(ownerFilter(req.user.tenantId)).select('name').sort({ name: 1 }).lean();
        return res.json(owners);
    } catch (error) {
        return res.status(500).json({ message: 'Could not load lead owners' });
    }
};

async function validateOwnerChange(req) {
    if (!Object.hasOwn(req.body, 'assignedSalesperson')) return null;
    if (!isLeadManager(req.user)) return { status: 403, message: 'Lead owner management requires an admin account' };
    const owner = req.body.assignedSalesperson;
    if (owner === null) return null;
    if (typeof owner !== 'string' || !/^[a-f\d]{24}$/i.test(owner)
        || !await User.exists({ ...ownerFilter(req.user.tenantId), _id: owner })) {
        return { status: 400, message: 'Choose an active salesperson in this workspace' };
    }
    return null;
}

// Get all leads for the logged-in tenant
exports.getLeads = async (req, res) => {
    try {
        console.log('GET /api/leads - tenantId from token:', req.user.tenantId);
        const leads = await Lead.find({ tenantId: req.user.tenantId })
                                .populate('assignedSalesperson', 'name email')
                                .sort({ createdAt: -1 });
        console.log('Found leads:', leads.length);
        res.json(leads);
    } catch (error) {
        console.error('getLeads error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Create a new lead
exports.createLead = async (req, res) => {
    try {
        const ownerError = await validateOwnerChange(req);
        if (ownerError) return res.status(ownerError.status).json({ message: ownerError.message });
        // Enforce Free Trial limits (Max 50 leads during 30-day trial)
        const tenant = await Tenant.findById(req.user.tenantId);
        if (tenant && tenant.status === 'trial') {
            const currentLeadCount = await Lead.countDocuments({ tenantId: req.user.tenantId });
            const maxAllowed = tenant.maxLeads || 50;
            if (currentLeadCount >= maxAllowed) {
                return res.status(403).json({ 
                    message: `30-Day Free Trial limit reached! You can manage up to ${maxAllowed} leads on the free trial. Please upgrade to add more leads.` 
                });
            }
        }

        // Generate a random Lead ID (e.g., LD-12345)
        const leadId = 'LD-' + Math.floor(10000 + Math.random() * 90000);
        
        const newLead = new Lead({
            ...req.body,
            leadId,
            tenantId: req.user.tenantId,
            convertedAt: req.body.leadStatus === 'Converted' ? new Date() : null
        });

        const savedLead = await newLead.save();
        res.status(201).json(savedLead);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error while creating lead' });
    }
};

// Update a lead
exports.updateLead = async (req, res) => {
    try {
        const ownerError = await validateOwnerChange(req);
        if (ownerError) return res.status(ownerError.status).json({ message: ownerError.message });
        const filter = { _id: req.params.id, tenantId: req.user.tenantId };
        const updates = { ...req.body };
        delete updates.tenantId;
        delete updates.convertedAt;

        // Sequential Callback Guard: Cannot jump ahead to higher callbacks without completing earlier ones
        if (typeof updates.callStatus === 'string') {
            const cbMatch = updates.callStatus.match(/Callback\s*\(?(\d)\)?/i);
            if (cbMatch) {
                const requestedLevel = parseInt(cbMatch[1], 10);
                const existing = await Lead.findOne(filter).select('callStatus callback1Description callback2Description callback3Description callback4Description callback5Description callHistory').lean();
                if (existing) {
                    let highestSaved = 0;
                    ['1', '2', '3', '4', '5'].forEach(n => {
                        if (existing['callback' + n + 'Description'] && String(existing['callback' + n + 'Description']).trim()) {
                            highestSaved = Math.max(highestSaved, parseInt(n, 10));
                        }
                    });
                    const sMatch = (existing.callStatus || '').match(/Callback\s*\(?(\d)\)?/i);
                    if (sMatch) highestSaved = Math.max(highestSaved, parseInt(sMatch[1], 10));
                    if (Array.isArray(existing.callHistory)) {
                        existing.callHistory.forEach(h => {
                            const hStatus = typeof h === 'string' ? h : h?.status || h?.callStatus || '';
                            const m = hStatus.match(/Callback\s*\(?(\d)\)?/i);
                            if (m) highestSaved = Math.max(highestSaved, parseInt(m[1], 10));
                        });
                    }
                    const nextAllowed = Math.min(5, highestSaved + 1);
                    if (requestedLevel > nextAllowed) {
                        return res.status(400).json({
                            message: `Callback (${requestedLevel}) is locked. Please complete Callback (${nextAllowed}) first.`
                        });
                    }
                }
            }
        }

        const callHistoryEntry = typeof updates.callStatus === 'string'
            ? { status: updates.callStatus, date: new Date() } : null;

        if (updates.leadStatus === undefined) {
            const lead = await Lead.findOneAndUpdate(filter, { $set: updates }, { new: true });
            if (!lead) return res.status(404).json({ message: 'Lead not found' });
            return res.json(lead);
        }

        // Apply a stage change only against the state it was calculated from.
        for (let attempt = 0; attempt < 3; attempt++) {
            const current = await Lead.findOne(filter).select('leadStatus').lean();
            if (!current) return res.status(404).json({ message: 'Lead not found' });
            const lead = await Lead.findOneAndUpdate(
                { ...filter, leadStatus: current.leadStatus ?? null },
                {
                    $set: { ...updates, ...conversionChange(current.leadStatus, updates.leadStatus) },
                    ...(callHistoryEntry && { $push: { callHistory: callHistoryEntry } })
                },
                { new: true }
            );
            if (lead) return res.json(lead);
        }
        return res.status(409).json({ message: 'The lead changed while you were saving. Try again.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete a lead
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json({ message: 'Lead removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
const SourceConfig = require('../models/SourceConfig');

exports.getConfig = async (req, res) => {
    try {
        let config = await SourceConfig.findOne({ tenantId: req.user.tenantId, sourceName: req.params.sourceName });
        if (!config && req.params.sourceName.startsWith('service:') && typeof req.query.fallback === 'string') {
            const aliases = ['Meta', 'Meta Leads', 'Meta Ads'].includes(req.query.fallback) ? ['Meta Leads', 'Meta', 'Meta Ads']
                : ['Cold', 'Cold Leads', 'Cold Call'].includes(req.query.fallback) ? ['Cold Leads', 'Cold', 'Cold Call']
                    : [req.query.fallback];
            const configs = await SourceConfig.find({ tenantId: req.user.tenantId, sourceName: { $in: aliases } });
            config = aliases.map(sourceName => configs.find(entry => entry.sourceName === sourceName)).find(Boolean);
        }
        if (!config) config = new SourceConfig({ tenantId: req.user.tenantId, sourceName: req.params.sourceName });
        res.json(config);
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.saveConfig = async (req, res) => {
    try {
        const config = await SourceConfig.findOneAndUpdate(
            { tenantId: req.user.tenantId, sourceName: req.params.sourceName },
            { proposalMessage: req.body.proposalMessage },
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (e) {
        res.status(500).json({ message: 'Server error' });
    }
};
