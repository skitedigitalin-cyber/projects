const express = require('express');
const StaffAccess = require('../models/RobotriqStaffAccess');
const User = require('../models/User');
const Employee = require('../models/Employee');
const protect = require('../middleware/authMiddleware');
const { tenantId, staffRoles, sameAccessRole, getRobotriqPermissions, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
const admin = requireRobotriqRole('Admin');
const staff = requireRobotriqRole('Admin', ...staffRoles);
const scope = { tenantId, isActive: true, role: { $in: staffRoles } };
const modules = [
    { id: 'assignTasks', label: 'Assign student tasks', group: 'Dashboard' },
    { id: 'assignEmployeeTasks', label: 'Assign employee tasks', group: 'Dashboard' },
    { id: 'manageLeads', label: 'Manage Training Leads', group: 'Dashboard' },
    { id: 'studentAttendance', label: 'View Student Attendance', group: 'Dashboard' },
    { id: 'accountsHub', label: 'Accounts Hub', group: 'Dashboard' },
    { id: 'paymentReceipt', label: 'Payment Receipt', group: 'Dashboard' },
    { id: 'certifications', label: 'Certifications', group: 'Dashboard' },
    { id: 'salesDashboard', label: 'Mine Power dashboard', group: 'Sales' },
    { id: 'salesLeads', label: 'Mine Power enquiries', group: 'Sales' },
    { id: 'salesCustomers', label: 'Customers', group: 'Sales' },
    { id: 'salesItems', label: 'Items Master', group: 'Sales' },
    { id: 'salesBom', label: 'Bills of Materials', group: 'Sales' },
    { id: 'salesQuotation', label: 'Mine Power quotations', group: 'Sales' },
    { id: 'salesExpenses', label: 'Mine Power expenses', group: 'Sales' },
    { id: 'salesAccounts', label: 'Mine Power sale accounts', group: 'Sales' }
];

function staffRow(user, access, employeeCode) {
    return { _id: user._id, name: user.name, role: user.role, employeeCode,
        paused: Boolean(access && (!access.enabled || !sameAccessRole(access, user.role))),
        updatedAt: access?.updatedAt || null,
        permissions: Object.fromEntries(modules.map(({ id, group }) => [id,
            (group === 'Sales' && user.role === 'Sales') || access?.permissions?.[id] === true])) };
}

router.use(protect);
router.get('/me', staff, async (req, res) => {
    const user = await User.findOne({ _id: req.user.userId, tenantId, isActive: true }).select('role').lean();
    res.json({ permissions: user ? await getRobotriqPermissions(user) : {} });
});

router.get('/', admin, async (req, res) => {
    const [users, grants, employees] = await Promise.all([
        User.find(scope).select('name role').sort({ name: 1, _id: 1 }).lean(),
        StaffAccess.find({ tenantId }).select('currentUserId legacyRole authorizedRole enabled permissions updatedAt').lean(),
        Employee.find({ tenantId, userId: { $exists: true } }).select('userId employeeId').lean()
    ]);
    const byUser = new Map(grants.map(row => [String(row.currentUserId), row]));
    const code = new Map(employees.map(row => [String(row.userId), row.employeeId]));
    res.json({ modules, staff: users.map(user => staffRow(user, byUser.get(String(user._id)), code.get(String(user._id)))) });
});

router.patch('/:id', admin, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const { permissions, updatedAt = null } = req.body || {};
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Choose permissions to update.' });
    }
    const changes = Object.entries(permissions);
    if (!changes.length || changes.some(([key, value]) => typeof value !== 'boolean' || !modules.some(module => module.id === key))) {
        return res.status(400).json({ message: 'Choose supported Robotriq permissions.' });
    }
    const user = await User.findOne({ ...scope, _id: req.params.id }).select('name role').lean();
    if (!user) return res.sendStatus(404);
    if (user.role === 'Sales' && changes.some(([key]) => modules.some(module => module.id === key && module.group === 'Sales'))) {
        return res.status(400).json({ message: 'Sales permissions already come from this account’s role.' });
    }
    const identity = { tenantId, currentUserId: user._id };
    const current = await StaffAccess.findOne(identity).lean();
    if (current && (!current.enabled || !sameAccessRole(current, user.role))) {
        return res.status(409).json({ message: 'Resolve this staff account’s role before editing access.' });
    }
    if ((current?.updatedAt?.toISOString() ?? null) !== updatedAt) {
        return res.status(409).json({ message: 'Access changed. Reload permissions before saving.' });
    }
    const updatedBy = req.user.userId;
    if (!current) {
        await StaffAccess.init();
        try {
            const saved = await StaffAccess.create({ ...identity, authorizedRole: user.role, updatedBy, enabled: true, permissions });
            return res.json(staffRow(user, saved.toObject({ flattenMaps: true })));
        } catch (error) {
            if (error.code !== 11000) throw error;
            return res.status(409).json({ message: 'Access changed. Reload permissions before saving.' });
        }
    }
    const settings = Object.fromEntries(changes.map(([key, value]) => [`permissions.${key}`, value]));
    const saved = await StaffAccess.findOneAndUpdate({ ...identity, updatedAt: current.updatedAt ?? null, enabled: true },
        { $set: { ...settings, updatedBy } }, { returnDocument: 'after', runValidators: true }).lean();
    if (!saved) return res.status(409).json({ message: 'Access changed. Reload permissions before saving.' });
    res.json(staffRow(user, saved));
});

module.exports = router;
