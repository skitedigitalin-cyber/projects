const mongoose = require('mongoose');

const tenantId = { type: mongoose.Schema.Types.ObjectId, required: true, index: true };
const trainingLeadSchema = new mongoose.Schema({
    tenantId,
    currentLeadId: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    codeNo: String,
    company: String,
    mobile: String,
    email: String,
    course: String,
    archivedAt: Date
}, { timestamps: true, strict: false });

const reminderSchema = new mongoose.Schema({
    tenantId,
    leadId: { type: mongoose.Schema.Types.ObjectId, required: true },
    leadSource: { type: String, enum: ['legacy', 'current'], required: true },
    leadName: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['note', 'task'], default: 'note' },
    completed: { type: Boolean, default: false },
    fromLeadPlan: Boolean
}, { timestamps: true });
reminderSchema.index({ tenantId: 1, completed: 1, date: 1 });
reminderSchema.index({ tenantId: 1, leadId: 1 }, {
    unique: true, partialFilterExpression: { leadSource: 'legacy', fromLeadPlan: true }
});

module.exports = {
    TrainingLead: mongoose.model('RobotriqTrainingLead', trainingLeadSchema, 'robotriq_training_leads'),
    Reminder: mongoose.model('RobotriqReminder', reminderSchema, 'robotriq_reminders')
};
