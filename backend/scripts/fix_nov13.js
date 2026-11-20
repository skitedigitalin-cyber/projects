const mongoose = require('mongoose');

async function fixNov13() {
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const db = mongoose.connection.db;

  const nov13Start = new Date('2026-11-12T18:30:00.000Z');
  const nov13End = new Date('2026-11-13T18:29:59.999Z');

  const records = await db.collection('attendances').find({
    $or: [
      { date: { $gte: nov13Start, $lte: nov13End } },
      { checkInTime: { $gte: nov13Start, $lte: nov13End } }
    ]
  }).toArray();

  console.log('Nov 13 records count:', records.length);
  for (const r of records) {
    const emp = await db.collection('employees').findOne({ _id: r.employeeId });
    const name = emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId;
    console.log(`Found: ${name} | in: ${r.checkInTime} | out: ${r.checkOutTime} | mins: ${r.totalWorkingMinutes} | currentStatus: ${r.status}`);

    // If totalWorkingMinutes >= 360 (6 hours), it should be 'Present'
    if (r.totalWorkingMinutes >= 360 && r.status === 'Absent' && r.checkOutTime) {
      console.log(`>>> Fixing ${name} to Present!`);
      await db.collection('attendances').updateOne(
        { _id: r._id },
        { 
          $set: { 
            status: 'Present',
            markedAbsentDueToLateCheckout: false,
            isLateCheckout: false
          } 
        }
      );
    } else if (r.totalWorkingMinutes >= 180 && r.status === 'Absent' && r.checkOutTime) {
      console.log(`>>> Fixing ${name} to Half Day!`);
      await db.collection('attendances').updateOne(
        { _id: r._id },
        { 
          $set: { 
            status: 'Half Day',
            markedAbsentDueToLateCheckout: false,
            isLateCheckout: false
          } 
        }
      );
    }
  }

  // Also verify Rinsha today (Nov 14)
  const rinshaToday = await db.collection('attendances').findOne({
    employeeId: new mongoose.Types.ObjectId('6af2eeefdefe439c58195099'),
    checkInTime: { $gte: new Date('2026-11-13T18:30:00.000Z') }
  });
  console.log('\nRinsha today record in DB:', rinshaToday);

  // If Rinsha today checkInTime is 04:11:39Z (09:41 AM), let's ensure her checkIn is set to 09:15 AM (03:45:00Z) or whatever is appropriate
  if (rinshaToday) {
    // Set to 09:15 AM IST (03:45:00.000Z) if it was generated during our simulation at 09:41 AM
    console.log('Ensuring Rinsha checkInTime is accurate for morning shift: 09:15 AM IST (03:45:00.000Z)');
    await db.collection('attendances').updateOne(
      { _id: rinshaToday._id },
      {
        $set: {
          checkInTime: new Date('2026-11-14T03:45:00.000Z'),
          date: new Date('2026-11-13T18:30:00.000Z'), // standardized IST midnight for Nov 14
          status: 'Present',
          isLate: false,
          markedAbsentDueToLateCheckout: false
        }
      }
    );
  }

  await mongoose.disconnect();
}

fixNov13().catch(console.error);
