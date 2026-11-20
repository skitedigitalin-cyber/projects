const Tenant = require('../models/Tenant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all clients (Tenants) and their Admin User
exports.getClients = async (req, res) => {
    try {
        const tenants = await Tenant.find({ subDomain: { $ne: 'hq' } }).sort({ createdAt: -1 }).lean();
        
        // Attach the primary Admin user for each tenant
        for (let t of tenants) {
            const admin = await User.findOne({ tenantId: t._id, role: 'Admin' }).lean();
            t.adminUser = admin ? { name: admin.name, email: admin.email } : null;
        }

        res.json(tenants);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Create new Client (Tenant + Admin User)
exports.createClient = async (req, res) => {
    try {
        const { companyName, subDomain, adminName, adminEmail, adminPassword, activeModules, trialDays } = req.body;

        const existingEmail = await User.findOne({ email: adminEmail });
        if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

        const existingSubDomain = await Tenant.findOne({ subDomain });
        if (existingSubDomain) return res.status(400).json({ message: 'Subdomain already taken' });

        const days = trialDays ? parseInt(trialDays) : 1;

        const tenant = new Tenant({
            companyName,
            subDomain,
            activeModules: activeModules || ['dashboard', 'sales', 'finance', 'hr', 'projects'],
            status: 'trial',
            validUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        });
        await tenant.save();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const adminUser = new User({
            tenantId: tenant._id,
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'Admin'
        });
        await adminUser.save();

        res.status(201).json({ message: 'Client created successfully. 1-Day Free Trial started.', tenant });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update Client Modules
exports.updateClientModules = async (req, res) => {
    try {
        const { activeModules } = req.body;
        const tenant = await Tenant.findByIdAndUpdate(req.params.id, { activeModules }, { new: true });
        if (!tenant) return res.status(404).json({ message: 'Client not found' });
        res.json({ message: 'Modules updated successfully', tenant });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Toggle Client Status (Active/Inactive)
exports.toggleClientStatus = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Client not found' });

        tenant.isActive = !tenant.isActive;
        await tenant.save();

        // Also deactivate all users under this tenant
        await User.updateMany({ tenantId: tenant._id }, { isActive: tenant.isActive });

        res.json({ message: `Client ${tenant.isActive ? 'activated' : 'deactivated'} successfully`, tenant });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
const SystemSettings = require('../models/SystemSettings');

// Get Global Settings (Pricing)
exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.find();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update Global Settings
exports.updateSettings = async (req, res) => {
    try {
        const { key, value } = req.body;
        const setting = await SystemSettings.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true }
        );
        res.json({ message: 'Settings updated successfully', setting });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update Client Trial/Validity Days
exports.updateClientTrial = async (req, res) => {
    try {
        const { id } = req.params;
        const { trialDays } = req.body; // Add these many days from NOW
        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Client not found' });
        
        tenant.validUntil = new Date(Date.now() + parseInt(trialDays) * 24 * 60 * 60 * 1000);
        if (tenant.status === 'expired') {
            tenant.status = 'trial';
        }
        await tenant.save();
        
        res.json({ message: 'Trial extended successfully', tenant });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Delete Client Workspace and all associated data
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await Tenant.findById(id);
        if (!tenant) return res.status(404).json({ message: 'Workspace not found' });

        if (tenant.subDomain === 'hq') {
            return res.status(400).json({ message: 'Cannot delete HQ Super Admin workspace' });
        }

        // Delete all users under this tenant
        await User.deleteMany({ tenantId: id });

        // Delete other tenant documents if models exist
        try { const Lead = require('../models/Lead'); await Lead.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Invoice = require('../models/Invoice'); await Invoice.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Customer = require('../models/Customer'); await Customer.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Vendor = require('../models/Vendor'); await Vendor.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Payment = require('../models/Payment'); await Payment.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Employee = require('../models/Employee'); await Employee.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Attendance = require('../models/Attendance'); await Attendance.deleteMany({ tenantId: id }); } catch (e) {}
        try { const Event = require('../models/Event'); await Event.deleteMany({ tenantId: id }); } catch (e) {}

        await Tenant.findByIdAndDelete(id);

        res.json({ message: `Workspace '${tenant.companyName}' deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

