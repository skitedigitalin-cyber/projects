const express = require('express');
const LegacyTask = require('../models/RobotriqLegacyTask');
const Student = require('../models/Student');
const StudentTask = require('../models/StudentTask');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const { payrollDay } = require('../utils/robotriqPayroll');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const admin = requireRobotriqRole('Admin');
const staff = requireRobotriqRole('Employee', 'Manager', 'Sales');
const personalScope = req => ({ tenantId, ownerType: 'staff', currentOwnerId: req.user.userId });
const fields = 'userName role ownerType title description dueDate status';
const objectIdPattern = /^[a-f0-9]{24}$/i;

router.use(protect);
router.get('/', admin, async (req, res) => {
    res.json(await LegacyTask.find({ tenantId }).select(fields).sort({ createdAt: -1 }).lean());
});

const audiences = [
    { path: 'employees', permission: 'assignEmployeeTasks', ownerType: 'staff', Recipient: Employee, Assignment: Task,
        scope: { tenantId, status: 'Active' }, nameFields: 'firstName lastName employeeId', ownerField: 'employeeId',
        recipient: row => ({ _id: row._id, name: [row.firstName, row.lastName].filter(Boolean).join(' '), code: row.employeeId }) },
    { path: 'students', permission: 'assignTasks', ownerType: 'student', Recipient: Student, Assignment: StudentTask,
        scope: { tenantId, status: { $ne: 'Discontinued' } }, nameFields: 'fullName studentId', ownerField: 'studentId',
        recipient: row => ({ _id: row._id, name: row.fullName, code: row.studentId }) }
];

for (const audience of audiences) {
    const { path, permission, ownerType, Recipient, Assignment, scope, nameFields, ownerField, recipient } = audience;
    const access = requireRobotriqPermission(permission);
    router.get(`/assignments/${path}`, access, async (req, res) => {
        const [available, current, history] = await Promise.all([
            Recipient.find(scope).select(nameFields).lean(),
            Assignment.find({ tenantId }).select(`title description dueDate status createdAt ${ownerField}`)
                .populate({ path: ownerField, match: { tenantId }, select: nameFields }).lean(),
            LegacyTask.find({ tenantId, ownerType }).select(`${fields} createdAt`).lean()
        ]);
        const tasks = current.filter(row => row[ownerField]).map(({ [ownerField]: owner, ...task }) => ({
            ...task, userName: recipient(owner).name, dueDate: payrollDay(task.dueDate)
        }));
        res.json({ recipients: available.map(recipient).sort((a, b) => a.name.localeCompare(b.name)),
            tasks: [...tasks, ...history.map(row => ({ ...row, dueDate: payrollDay(row.dueDate) }))]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) });
    });

    router.post(`/assignments/${path}`, access, async (req, res) => {
        const { recipientId, title, description = '', dueDate = '' } = req.body || {};
        if (typeof recipientId !== 'string' || !objectIdPattern.test(recipientId) ||
            typeof title !== 'string' || !title.trim() || title.length > 250 ||
            typeof description !== 'string' || description.length > 5000 ||
            typeof dueDate !== 'string' || payrollDay(dueDate) !== dueDate) {
            return res.status(400).json({ message: 'Enter an assignee, task title, and a valid due date if needed.' });
        }
        const owner = await Recipient.findOne({ ...scope, _id: recipientId }).select(nameFields).lean();
        if (!owner) return res.status(404).json({ message: 'Assignee not available in Robotriq.' });
        const task = await Assignment.create({ tenantId, [ownerField]: owner._id, assignedBy: req.user.userId,
            title: title.trim(), description: description.trim(), dueDate: dueDate || undefined });
        res.status(201).json({ _id: task._id, title: task.title, description: task.description,
            dueDate: payrollDay(task.dueDate), status: task.status, createdAt: task.createdAt, userName: recipient(owner).name });
    });
}

router.get('/mine', staff, async (req, res) => {
    res.json(await LegacyTask.find(personalScope(req)).select(fields).sort({ createdAt: -1 }).lean());
});
router.patch('/mine/:id/complete', staff, async (req, res) => {
    if (!objectIdPattern.test(req.params.id)) return res.sendStatus(404);
    const scope = { ...personalScope(req), _id: req.params.id };
    const saved = await LegacyTask.findOneAndUpdate({ ...scope, status: { $ne: 'Completed' } },
        { $set: { status: 'Completed', completedAt: new Date() } }, { new: true }).select(fields).lean();
    if (saved) return res.json(saved);
    const task = await LegacyTask.findOne({ ...scope, status: 'Completed' }).select(fields).lean();
    if (!task) return res.sendStatus(404);
    res.json(task);
});

module.exports = router;
