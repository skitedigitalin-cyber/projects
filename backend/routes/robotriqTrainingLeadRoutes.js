const express = require('express');
const mongoose = require('mongoose');
const { TrainingLead, Reminder } = require('../models/RobotriqTrainingHistory');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqPermission, requireRobotriqRole } = require('../middleware/robotriqStaff');
const { payrollDay } = require('../utils/robotriqPayroll');

const router = express.Router();
const active = { tenantId, archivedAt: null };
const leadFields = [
    'codeNo', 'date', 'name', 'email', 'mobile', 'company', 'businessType', 'location', 'course', 'level', 'source',
    'managedBy', 'callStatus', 'followUpStatus', 'followUpResponsibility', 'remainder', 'remainder2Task',
    'remainder2Date', 'followUpAction', 'advancePayment', 'dealClosed', 'priority'
];
const requiredFields = ['date', 'name', 'mobile', 'location', 'course', 'managedBy'];
const courses = [
    'ABB PROCESS AUTOMATION', 'INDUSTRIAL AUTOMATION 4.0', 'ALLEN BRADLEY - ROCKWELL AUTOMATION',
    'SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION', 'SIEMENS INDUSTRIAL AUTOMATION', 'DELTA INDUSTRIAL AUTOMATION',
    'MITSUBISHI ELECTRIC FACTORY AUTOMATION'
];
const levels = { Beginner: 1, Intermediate: 2, Advance: 3, Master: 4, 'Certified Process Automation': courses.length };
const sources = ['Meta Leads', 'Cold Leads'];
const calls = ['Pending', 'Attend 1', 'Attend 2', 'Not Attend 1', 'Not Attend 2', 'Callback 1', 'Callback 2'];
const viewFields = [...leadFields, 'createdAt', 'updatedAt', 'attendCount', 'notAttendCount', 'callbackCount'].join(' ');
const validId = value => /^[a-f0-9]{24}$/i.test(value);
const indiaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });

function readValues(body, creating = false) {
    const values = {};
    for (const field of leadFields) {
        if (!Object.hasOwn(body, field)) continue;
        const value = body[field];
        if (typeof value !== 'string' || value.length > 2000) return null;
        values[field] = value.trim();
    }
    if (!Object.keys(values).length || requiredFields.some(field =>
        (creating || Object.hasOwn(values, field)) && !values[field])) return null;
    if ((values.date && payrollDay(values.date) !== values.date) ||
        (values.remainder2Date && payrollDay(values.remainder2Date) !== values.remainder2Date) ||
        (values.source && !sources.includes(values.source)) || (values.callStatus && !calls.includes(values.callStatus)) ||
        (values.level && !Object.hasOwn(levels, values.level))) return null;
    return values;
}

function validCourses(values, previous) {
    const level = values.level || previous?.level;
    const selected = (values.course ?? previous?.course ?? '').split(',').map(course => course.trim()).filter(Boolean);
    if (!level) return !!previous;
    if (new Set(selected).size !== selected.length || !selected.length || selected.length > levels[level]) return false;
    if (level === 'Certified Process Automation') return selected.length === courses.length && courses.every(course => selected.includes(course));
    return true;
}

router.use(protect, requireRobotriqPermission('manageLeads'));
for (const param of ['id', 'reminderId']) router.param(param, (req, res, next, value) => validId(value) ? next() : res.sendStatus(404));

router.get('/', async (req, res) => {
    const leads = await TrainingLead.find(active).select(viewFields).sort({ createdAt: -1, _id: -1 }).lean();
    const reminders = await Reminder.find({ tenantId, leadSource: 'legacy', leadId: { $in: leads.map(row => row._id) } })
        .select('leadId leadName text date type completed').sort({ date: 1, _id: -1 }).lean();
    res.json({ leads, reminders, options: { courses, levels, sources, calls } });
});

router.post('/', async (req, res) => {
    const values = readValues(req.body || {}, true);
    if (!values || !validCourses(values) || !values.course.split(',').every(course => courses.includes(course.trim()))) {
        return res.status(400).json({ message: 'Enter the required lead details and choose courses for the training level.' });
    }
    const row = await TrainingLead.create({ source: 'Meta Leads', callStatus: 'Pending', priority: 'Medium',
        followUpAction: 'Pending', dealClosed: 'No', ...values, tenantId });
    res.status(201).json({ _id: row._id });
});

router.patch('/:id', async (req, res) => {
    const values = readValues(req.body || {});
    if (!values) return res.status(400).json({ message: 'Enter valid lead details.' });
    const scope = { ...active, _id: req.params.id };
    const previous = await TrainingLead.findOne(scope).select('updatedAt callStatus course level remainder2Date remainder2Task').lean();
    if (!previous) return res.sendStatus(404);
    if (('course' in values || 'level' in values) && !validCourses(values, previous)) {
        return res.status(400).json({ message: 'Choose courses for the training level.' });
    }
    const status = previous.callStatus === values.callStatus ? '' : values.callStatus?.toLowerCase() || '';
    const counters = { 'not attend': 'notAttendCount', attend: 'attendCount', callback: 'callbackCount' };
    const count = counters[Object.keys(counters).find(prefix => status.startsWith(prefix))];
    const filter = { ...scope, updatedAt: previous.updatedAt ?? null };
    const update = { $set: values, ...(count && { $inc: { [count]: 1 } }) };
    const planChanged = ['remainder2Date', 'remainder2Task'].some(field => field in values && values[field] !== previous[field]);
    let saved;
    if (planChanged) {
        await Reminder.init();
        saved = await mongoose.connection.transaction(async session => {
            const row = await TrainingLead.findOneAndUpdate(filter, update, { session, returnDocument: 'after' })
                .select('name remainder2Date remainder2Task').lean();
            if (!row) return false;
            const plan = { tenantId, leadSource: 'legacy', leadId: row._id, fromLeadPlan: true };
            const text = row.remainder2Task?.trim();
            if (text && !['None', 'Set Value'].includes(text)) {
                await Reminder.updateOne(plan, { $set: { leadName: row.name, text, type: 'task', completed: false,
                    date: payrollDay(row.remainder2Date) || indiaDay.format(new Date()) } }, { upsert: true, session });
            } else {
                await Reminder.deleteOne(plan, { session });
            }
            return true;
        });
    } else {
        saved = (await TrainingLead.updateOne(filter, update)).matchedCount;
    }
    if (!saved) return res.status(409).json({ message: 'This lead changed. Reload it and try again.' });
    res.sendStatus(204);
});

router.delete('/:id', requireRobotriqRole('Admin'), async (req, res) => {
    const result = await TrainingLead.updateOne({ ...active, _id: req.params.id }, { $set: { archivedAt: new Date() } });
    res.sendStatus(result.matchedCount ? 204 : 404);
});

router.post('/:id/reminders', async (req, res) => {
    const { text, date, type = 'task' } = req.body || {};
    if (typeof text !== 'string' || !text.trim() || text.length > 2000 || !date || payrollDay(date) !== date ||
        !['note', 'task'].includes(type)) {
        return res.status(400).json({ message: 'Enter a reminder and a valid date.' });
    }
    const row = await TrainingLead.findOne({ ...active, _id: req.params.id }).select('name').lean();
    if (!row) return res.sendStatus(404);
    const reminder = await Reminder.create({ tenantId, leadId: row._id, leadSource: 'legacy', leadName: row.name,
        text: text.trim(), date, type });
    res.status(201).json({ _id: reminder._id });
});

router.patch('/:id/reminders/:reminderId/complete', async (req, res) => {
    const changed = await mongoose.connection.transaction(async session => {
        const lead = await TrainingLead.findOne({ ...active, _id: req.params.id }).select('_id').session(session).lean();
        if (!lead) return false;
        const reminder = await Reminder.findOne({ tenantId, leadSource: 'legacy', leadId: lead._id, _id: req.params.reminderId })
            .select('completed').session(session).lean();
        if (!reminder) return false;
        if (!reminder.completed) {
            await Reminder.updateOne({ tenantId, _id: reminder._id }, { $set: { completed: true } }, { session });
            await TrainingLead.updateOne({ ...active, _id: lead._id }, { $set: { followUpAction: 'Completed' } }, { session });
        }
        return true;
    });
    res.sendStatus(changed ? 204 : 404);
});

module.exports = router;
