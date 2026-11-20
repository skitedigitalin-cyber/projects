const mongoose = require('mongoose');

async function checkOldToday() {
  await mongoose.connect('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM');
  const db = mongoose.connection.db;

  const todayStart = new Date('2026-11-13T18:30:00.000Z');
  const allOld = await db.collection('attendances').find({
    $or: [
      { checkInTime: { $gte: todayStart } },
      { createdAt: { $gte: todayStart } },
      { date: { $gte: todayStart } }
    ]
  }).toArray();

  console.log('Total records matching in old DB:', allOld.length);
  for (const a of allOld) {
    if (a.taskDescription !== 'Sunday') {
      console.log('Non-Sunday record in old DB:', {
        id: a._id,
        user: a.user,
        userId: a.userId,
        checkInTime: a.checkInTime,
        taskDescription: a.taskDescription
      });
    }
  }

  await mongoose.disconnect();
}

checkOldToday().catch(console.error);
