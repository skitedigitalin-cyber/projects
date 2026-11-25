const mongoose = require('mongoose');
const { tenantId } = require('../middleware/robotriqStaff');

module.exports = async function nextRobotriqNumber(Model, field, prefix, sequence, session, minimum = 0) {
    const records = await Model.find({ tenantId, [field]: { $regex: `^${prefix}[0-9]+$` } })
        .select(field).session(session).lean();
    const largest = records.reduce((max, record) => Math.max(max, Number(record[field].slice(prefix.length))), minimum);
    const counter = await mongoose.connection.db.collection('robotriq_sequences').findOneAndUpdate(
        { _id: `${tenantId}:${sequence}` },
        [{ $set: { tenantId: new mongoose.Types.ObjectId(tenantId), value: { $add: [{ $max: [{ $ifNull: ['$value', 0] }, largest] }, 1] } } }],
        { upsert: true, returnDocument: 'after', session }
    );
    return prefix + String(counter.value).padStart(3, '0');
};
