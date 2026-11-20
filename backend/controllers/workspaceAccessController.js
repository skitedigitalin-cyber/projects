const Employee = require('../models/Employee');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

const managerRoles = ['Admin', 'CEO'];
const editableModules = new Set(['sales', 'finance', 'hr', 'calendar', 'projects']);

const canManage = ({ tenantId, userId, role }) => managerRoles.includes(role) &&
    User.exists({ _id: userId, tenantId, role: { $in: managerRoles }, isActive: { $ne: false } });

exports.getWorkspaceAccess = async (req, res) => {
    try {
        if (!await canManage(req.user)) return res.status(403).json({ message: 'Workspace admin access required' });
        const { tenantId } = req.user;
        const [employees, tenant] = await Promise.all([
            Employee.find({ tenantId, status: { $ne: 'Inactive' } }).select('firstName lastName department designation userId')
                .sort({ firstName: 1, lastName: 1 })
                .populate({ path: 'userId', select: 'activeModules', match: { tenantId, role: { $nin: managerRoles }, isActive: { $ne: false } } })
                .lean(),
            Tenant.findById(tenantId).select('maxEmployees').lean()
        ]);
        return res.json({
            seatsUsed: employees.length,
            seatLimit: tenant?.maxEmployees ?? null,
            employees: employees.filter(employee => employee.userId).map(employee => ({
                id: employee.userId._id,
                name: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
                designation: employee.designation || employee.department,
                activeModules: employee.userId.activeModules || []
            }))
        });
    } catch (error) {
        console.error('Workspace access could not be loaded:', error.message);
        return res.status(500).json({ message: 'Could not load module access' });
    }
};

exports.updateWorkspaceAccess = async (req, res) => {
    try {
        if (!await canManage(req.user)) return res.status(403).json({ message: 'Workspace admin access required' });
        const { tenantId } = req.user;
        const { id } = req.params;
        const { module, enabled } = req.body;
        if (!/^[a-f\d]{24}$/i.test(id) || !editableModules.has(module) || typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Choose an employee and a supported module' });
        }
        if (!await Employee.exists({ tenantId, userId: id, status: { $ne: 'Inactive' } })) {
            return res.status(404).json({ message: 'Active employee not found' });
        }
        const update = enabled ? { $addToSet: { activeModules: module } } : { $pull: { activeModules: module } };
        const user = await User.findOneAndUpdate({ _id: id, tenantId, role: { $nin: managerRoles }, isActive: { $ne: false } }, update, { new: true })
            .select('activeModules').lean();
        if (!user) return res.status(404).json({ message: 'Active employee not found' });
        return res.json({ activeModules: user.activeModules });
    } catch (error) {
        console.error('Workspace access could not be updated:', error.message);
        return res.status(500).json({ message: 'Could not update module access' });
    }
};
