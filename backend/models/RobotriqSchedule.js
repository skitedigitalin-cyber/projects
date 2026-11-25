const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    day: String,
    dayNum: Number,
    topic: String,
    trainer: String,
    link: String
});

const scheduleSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    group: { type: String, required: true },
    course: { type: String, required: true },
    weeklySchedule: [slotSchema]
}, { timestamps: true });

scheduleSchema.index({ tenantId: 1, group: 1 }, { unique: true });

module.exports = mongoose.model('RobotriqSchedule', scheduleSchema, 'robotriq_schedules');
