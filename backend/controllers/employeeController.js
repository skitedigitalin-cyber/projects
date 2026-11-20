const Employee = require('../models/Employee');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const bcrypt = require('bcryptjs');

exports.getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ tenantId: req.user.tenantId })
            .populate('userId', 'email role activeModules isActive')
            .sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createEmployee = async (req, res) => {
    try {
        const { 
            employeeId, firstName, lastName, fullName, email, phone, dob, photo, department, designation, 
            shift, dateOfJoining, joiningDate, password, role, empRole, activeModules, perDaySalary, salary, salaryBasic,
            panNumber, aadharNumber, bankName, accountNumber, accNumber, ifscCode 
        } = req.body;

        const resolvedEmpId = (employeeId || req.body.empId || '').trim();
        if (!resolvedEmpId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        const resolvedFirstName = firstName || (fullName ? fullName.trim().split(' ')[0] : 'Employee');
        const resolvedLastName = lastName !== undefined ? lastName : (fullName ? fullName.trim().split(' ').slice(1).join(' ') : '');
        const resolvedFullName = fullName || `${resolvedFirstName} ${resolvedLastName}`.trim();
        const resolvedRole = role || empRole || 'Employee';
        const resolvedPerDaySalary = Number(perDaySalary) || Number(salary) || 0;
        const resolvedDateOfJoining = dateOfJoining || joiningDate || new Date();
        const resolvedAccNumber = accountNumber || accNumber || '';
        
        // Enforce Free Trial limits (Max 5 employees during 30-day trial)
        const tenant = await Tenant.findById(req.user.tenantId);
        if (tenant && tenant.status === 'trial') {
            const activeEmpCount = await Employee.countDocuments({ tenantId: req.user.tenantId, status: { $ne: 'Inactive' } });
            const maxAllowed = tenant.maxEmployees || 5;
            if (activeEmpCount >= maxAllowed) {
                return res.status(403).json({ 
                    message: `30-Day Free Trial limit reached! You can add up to ${maxAllowed} employees on the free trial. Please upgrade to add more employees.` 
                });
            }
        }

        const normalizedEmail = (email || `${resolvedEmpId.toLowerCase().replace(/[^a-z0-9]/g, '')}@robotriq.com`).trim().toLowerCase();
        // Check if user or employee email already exists
        let userExists = await User.findOne({ email: normalizedEmail });
        let empExistsByEmail = await Employee.findOne({ email: normalizedEmail });
        if (userExists || empExistsByEmail) return res.status(400).json({ message: 'User or employee with this email already exists' });

        // Check if Employee ID exists
        let empExists = await Employee.findOne({ tenantId: req.user.tenantId, employeeId: resolvedEmpId });
        if (empExists) return res.status(400).json({ message: 'Employee ID already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || 'Skite@123', salt);

        // Create User account for the employee
        const user = new User({
            tenantId: req.user.tenantId,
            name: resolvedFullName,
            email: normalizedEmail,
            password: hashedPassword,
            role: resolvedRole,
            activeModules: activeModules || []
        });
        await user.save();

        // Create Employee profile
        const employee = new Employee({
            tenantId: req.user.tenantId,
            userId: user._id,
            employeeId: resolvedEmpId,
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            email: normalizedEmail,
            phone: phone || '',
            dob: dob || '',
            photo: photo || '',
            department: department || '',
            designation: designation || '',
            role: resolvedRole,
            shift: shift || 'General',
            dateOfJoining: resolvedDateOfJoining,
            perDaySalary: resolvedPerDaySalary,
            salaryBasic: Number(salaryBasic) || 0,
            panNumber: panNumber ? panNumber.trim().toUpperCase() : '',
            aadharNumber: aadharNumber ? aadharNumber.trim() : '',
            bankName: bankName ? bankName.trim() : '',
            accountNumber: resolvedAccNumber ? resolvedAccNumber.trim() : '',
            ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : '',
            status: 'Active'
        });
        await employee.save();

        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        Object.assign(employee, req.body);
        if (req.body.status) {
            employee.status = req.body.status;
        }
        if (req.body.panNumber !== undefined) employee.panNumber = (req.body.panNumber || '').trim().toUpperCase();
        if (req.body.aadharNumber !== undefined) employee.aadharNumber = (req.body.aadharNumber || '').trim();
        if (req.body.bankName !== undefined) employee.bankName = (req.body.bankName || '').trim();
        if (req.body.accountNumber !== undefined) employee.accountNumber = (req.body.accountNumber || '').trim();
        if (req.body.ifscCode !== undefined) employee.ifscCode = (req.body.ifscCode || '').trim().toUpperCase();
        await employee.save();

        // Update User account (Name, Role, activeModules, Password, isActive)
        const user = await User.findById(employee.userId);
        if (user) {
            if (req.body.status) {
                user.isActive = req.body.status === 'Active';
            }
            if (req.body.firstName || req.body.lastName) {
                user.name = `${employee.firstName} ${employee.lastName || ''}`.trim();
            }
            if (req.body.role) {
                user.role = req.body.role;
            }
            if (req.body.activeModules !== undefined) {
                user.activeModules = req.body.activeModules;
            }
            if (req.body.password && req.body.password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }
            await user.save();
        }

        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        
        // If permanent deletion requested (?permanent=true)
        if (req.query.permanent === 'true') {
            if (employee.userId) {
                await User.findByIdAndDelete(employee.userId);
            }
            await Employee.findByIdAndDelete(employee._id);
            return res.json({ message: 'Employee permanently deleted from database' });
        }

        // Otherwise Deactivate (Block) User account to keep audit trail
        const user = await User.findById(employee.userId);
        if (user) {
            user.isActive = false;
            await user.save();
        }

        employee.status = 'Inactive';
        await employee.save();

        res.json({ message: 'Employee marked as inactive (Deactivated)' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
