const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const WebDevProject = require('../models/WebDevProject');
const SocialMediaProject = require('../models/SocialMediaProject');
const SEOProject = require('../models/SEOProject');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');

const presentStatuses = new Map([['Present', 1], ['WFH', 1], ['Half Day', 0.5], ['Absent', 0]]);

module.exports = async function loadDashboardTeam(tenantId, now, invoiceIncome) {
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const month = today.slice(0, 7);
    const monthStart = new Date(`${month}-01T00:00:00+05:30`);
    const todayStart = new Date(`${today}T00:00:00+05:30`);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const duringMonth = { $gte: monthStart, $lte: now };
    const [employees, attendance, tasks, social, web, seo, payments, purchases] = await Promise.all([
        Employee.find({ tenantId, status: 'Active' }).select('firstName lastName').sort({ firstName: 1 }).lean(),
        Attendance.find({ tenantId, date: { $gte: monthStart, $lt: todayEnd } }).select('employeeId date status').lean(),
        Task.find({ tenantId, $or: [{ dueDate: duringMonth }, { dueDate: null, createdAt: duringMonth }] }).select('employeeId status').lean(),
        SocialMediaProject.find({ tenantId }).select('status').lean(),
        WebDevProject.find({ tenantId }).select('projectStatus endDate').lean(),
        SEOProject.find({ tenantId }).select('projectStatus endDate').lean(),
        Payment.find({ tenantId, paymentDate: duringMonth, category: { $in: ['Direct Income', 'Direct Expense'] } }).select('category amount').lean(),
        Purchase.find({ tenantId, billDate: duringMonth }).select('grandTotal').lean()
    ]);

    const members = new Map(employees.map(employee => [
        String(employee._id),
        { id: employee._id, name: [employee.firstName, employee.lastName].filter(Boolean).join(' '), present: false, completed: 0, assigned: 0 }
    ]));
    let scheduledDays = 0;
    let presentDays = 0;
    for (const entry of attendance) {
        const present = presentStatuses.get(entry.status);
        if (present !== undefined) {
            scheduledDays++;
            presentDays += present;
        }
        const member = members.get(String(entry.employeeId));
        if (member && present > 0 && entry.date >= todayStart) member.present = true;
    }
    for (const task of tasks) {
        const member = members.get(String(task.employeeId));
        if (!member) continue;
        member.assigned++;
        if (task.status === 'Completed') member.completed++;
    }
    const team = [...members.values()];
    const projects = [...social, ...web, ...seo];
    const complete = project => (project.projectStatus || project.status) === 'Completed';
    const completed = projects.filter(complete).length;
    const overdue = projects.filter(project => !complete(project) && project.endDate && project.endDate < todayStart).length;
    const directAmount = category => payments.reduce((sum, payment) => sum + (payment.category === category ? payment.amount || 0 : 0), 0);
    return {
        month,
        attendance: { scheduledDays, presentDays },
        projects: { completed, overdue, total: projects.length },
        income: invoiceIncome + directAmount('Direct Income'),
        expense: purchases.reduce((sum, purchase) => sum + (purchase.grandTotal || 0), 0) + directAmount('Direct Expense'),
        team: { present: team.filter(member => member.present).length, total: team.length, members: team.slice(0, 5) }
    };
};
