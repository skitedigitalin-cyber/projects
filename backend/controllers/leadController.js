const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');

// Get overview stats for main dashboard
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
            initials: (l.customerName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        }));

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
            recentLeads
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        res.status(500).json({ message: 'Server Error fetching dashboard stats' });
    }
};

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
            tenantId: req.user.tenantId
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
        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            req.body,
            { new: true }
        );
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        res.json(lead);
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
