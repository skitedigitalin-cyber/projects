const mongoose = require('mongoose');

async function checkOldDb() {
  const conn = await mongoose.connect('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM');
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    $or: [{ name: /Rinsha/i }, { email: /rinsha/i }]
  }).toArray();
  console.log('Old DB Rinsha user:', users.map(u => ({ _id: u._id, name: u.name, email: u.email })));

  const attendances = await db.collection('attendances').find({
    checkInTime: { $gte: new Date('2026-11-13T18:30:00.000Z') }
  }).sort({ checkInTime: -1 }).toArray();

  console.log(`Old DB Nov 14 attendances count: ${attendances.length}`);
  for (const a of attendances) {
    const u = await db.collection('users').findOne({ _id: a.user });
    console.log(`Old DB: ${u ? u.name : a.user} | in: ${a.checkInTime} | out: ${a.checkOutTime} | task: ${a.taskDescription}`);
  }

  // Also check if Rinsha checked in at ANY time in last 24 hours in old DB
  if (users.length > 0) {
    const rinshaUser = users[0]._id;
    const rAtts = await db.collection('attendances').find({ user: rinshaUser }).sort({ checkInTime: -1 }).limit(5).toArray();
    console.log('\nOld DB Rinsha last 5 attendances:');
    rAtts.forEach(a => console.log(`in: ${a.checkInTime} | out: ${a.checkOutTime} | task: ${a.taskDescription}`));
  }

  await mongoose.disconnect();
}

checkOldDb().catch(console.error);
