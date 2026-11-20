const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const db = mongoose.connection.db;

  // 1. Find Rinsha employee
  const employees = await db.collection('employees').find({
    $or: [
      { firstName: /Rinsha/i },
      { lastName: /Rinsha/i }
    ]
  }).toArray();
  console.log('Rinsha Employee(s):', employees.map(e => ({ _id: e._id, name: `${e.firstName} ${e.lastName}`, userId: e.userId, tenantId: e.tenantId, employeeId: e.employeeId })));

  // 2. Check all attendance records for Rinsha
  if (employees.length > 0) {
    const rinshaId = employees[0]._id;
    const rinshaRecords = await db.collection('attendances').find({ employeeId: rinshaId }).sort({ date: -1, checkInTime: -1 }).limit(10).toArray();
    console.log('\nRinsha recent 10 attendances:');
    rinshaRecords.forEach(r => console.log({
      _id: r._id,
      date: r.date,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      status: r.status,
      notes: r.notes,
      totalWorkingMinutes: r.totalWorkingMinutes,
      markedAbsentDueToLateCheckout: r.markedAbsentDueToLateCheckout
    }));
  }

  // 3. Check today's (Nov 14, 2026) attendance records across ALL employees
  console.log('\n--- All Attendances for Nov 14, 2026 ---');
  const nov14Records = await db.collection('attendances').find({
    $or: [
      { date: { $gte: new Date('2026-11-13T18:30:00.000Z') } },
      { checkInTime: { $gte: new Date('2026-11-13T18:30:00.000Z') } }
    ]
  }).sort({ checkInTime: -1 }).toArray();
  console.log(`Total Nov 14 records: ${nov14Records.length}`);
  for (const r of nov14Records) {
    const emp = await db.collection('employees').findOne({ _id: r.employeeId });
    console.log(`${emp ? emp.firstName + ' ' + emp.lastName : r.employeeId}: checkIn: ${r.checkInTime?.toISOString()} | date: ${r.date?.toISOString()} | status: ${r.status}`);
  }

  // 4. Check yesterday's (Nov 13, 2026) attendance records that have status: 'Absent'
  console.log('\n--- Nov 13, 2026 Attendances marked Absent ---');
  const nov13Records = await db.collection('attendances').find({
    date: { 
      $gte: new Date('2026-11-12T18:30:00.000Z'), 
      $lte: new Date('2026-11-13T18:29:59.999Z') 
    }
  }).sort({ checkInTime: -1 }).toArray();

  for (const r of nov13Records) {
    const emp = await db.collection('employees').findOne({ _id: r.employeeId });
    console.log(`${emp ? emp.firstName + ' ' + emp.lastName : r.employeeId}: status: ${r.status} | in: ${r.checkInTime?.toISOString()} | out: ${r.checkOutTime?.toISOString()} | mins: ${r.totalWorkingMinutes} | markedAbsentDueToLateCheckout: ${r.markedAbsentDueToLateCheckout} | notes: ${r.notes}`);
  }

  await mongoose.disconnect();
}

diagnose().catch(console.error);
