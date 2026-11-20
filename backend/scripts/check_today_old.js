const mongoose = require('mongoose');

async function findTodayOld() {
  await mongoose.connect('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM');
  const db = mongoose.connection.db;

  const todayRecord = await db.collection('attendances').findOne({
    checkInTime: {
      $gte: new Date('2026-11-13T18:30:00.000Z'),
      $lte: new Date('2026-11-14T18:29:59.999Z')
    }
  });

  console.log('Today record in old DB:', todayRecord);
  if (todayRecord) {
    const user = await db.collection('users').findOne({ _id: todayRecord.user });
    console.log('User associated with this record:', user);
  }

  await mongoose.disconnect();
}

findTodayOld().catch(console.error);
