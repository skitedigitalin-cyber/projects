const mongoose = require('mongoose');

async function checkAllToday() {
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const db = mongoose.connection.db;

  const allNov14 = await db.collection('attendances').find({
    $or: [
      { checkInTime: { $gte: new Date('2026-11-13T18:30:00.000Z') } },
      { createdAt: { $gte: new Date('2026-11-13T18:30:00.000Z') } }
    ]
  }).toArray();

  console.log('ALL Nov 14 records in target DB:', allNov14.length);
  for (const a of allNov14) {
    const emp = await db.collection('employees').findOne({ _id: a.employeeId });
    console.log({
      id: a._id,
      empName: emp ? `${emp.firstName} ${emp.lastName}` : 'NO EMP FOUND',
      employeeId: a.employeeId,
      tenantId: a.tenantId,
      checkInTime: a.checkInTime,
      createdAt: a.createdAt,
      status: a.status
    });
  }

  await mongoose.disconnect();
}

checkAllToday().catch(console.error);
