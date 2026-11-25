const User = require('../models/User');
const StaffAccess = require('../models/RobotriqStaffAccess');

const tenantId = '6afd35731172da4b0de9a48e';
const staffRoles = ['Sales', 'Employee', 'Manager'];

function sameAccessRole(access, role) {
    return (access.authorizedRole || access.legacyRole || '').trim().toLowerCase() === role.trim().toLowerCase();
}

async function getRobotriqPermissions(user) {
    const access = await StaffAccess.findOne({ tenantId, currentUserId: user._id, enabled: true })
        .select('permissions legacyRole authorizedRole').lean();
    return access && sameAccessRole(access, user.role) ? access.permissions || {} : {};
}

function requireRobotriqRole(...roles) {
    return async (req, res, next) => {
        if (req.user?.tenantId !== tenantId) {
            return res.status(403).json({ message: 'Robotriq access required.' });
        }
        const staff = await User.exists({
            _id: req.user.userId, tenantId, isActive: true, role: { $in: roles }
        });
        if (!staff) return res.status(403).json({ message: 'This action requires a Robotriq staff role.' });
        next();
    };
}

function requireRobotriqPermission(permission, bypassRoles = ['Admin']) {
    return async (req, res, next) => {
        if (req.user?.tenantId !== tenantId) {
            return res.status(403).json({ message: 'Robotriq access required.' });
        }
        const user = await User.findOne({
            _id: req.user.userId, tenantId, isActive: true, role: { $in: ['Admin', ...staffRoles] }
        }).select('role').lean();
        if (!user) return res.status(403).json({ message: 'Robotriq staff access required.' });
        req.robotriqStaffRole = user.role;
        if (bypassRoles.includes(user.role)) return next();
        const permissions = await getRobotriqPermissions(user);
        if (permissions[permission] !== true) return res.status(403).json({ message: 'This Robotriq permission is required.' });
        next();
    };
}

function requireRobotriqSalesPermission(permission) {
    return requireRobotriqPermission(permission, ['Admin', 'Sales']);
}

module.exports = { tenantId, staffRoles, sameAccessRole, getRobotriqPermissions,
    requireRobotriqRole, requireRobotriqPermission, requireRobotriqSalesPermission };
