const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function migrateEmployeeAttendance() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  const skiteUri = process.env.MONGO_URI;

  console.log('Connecting to Robotriq DB (READ ONLY)...');
  const rConn = await mongoose.createConnection(robotriqUri).asPromise();

  console.log('Connecting to Skite Prime DB...');
  const sConn = await mongoose.createConnection(skiteUri).asPromise();

  const targetTenantId = new mongoose.Types.ObjectId('6afd35731172da4b0de9a48e');

  const RAttendance = rConn.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const RUser = rConn.model('User', new mongoose.Schema({}, { strict: false }));
  const SEmployee = sConn.model('Employee', require('../models/Employee').schema);
  const SAttendance = sConn.model('Attendance', require('../models/Attendance').schema);

  const employees = await SEmployee.find({ tenantId: targetTenantId }).lean();
  console.log(`Found ${employees.length} employees in Skite Prime.`);

  const rUsers = await RUser.find().lean();
  const rUserMap = {};
  rUsers.forEach(u => { rUserMap[u._id.toString()] = u; });

  const sourceAtts = await RAttendance.find({ role: { $ne: 'student' } }).sort({ createdAt: 1 }).lean();
  console.log(`Found ${sourceAtts.length} employee attendance records in Robotriq.`);

  // Time parsing helper
  const parseTimeToDate = (baseDate, timeStr) => {
    if (!timeStr || timeStr === '--' || timeStr === 'N/A') return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      let mins = parseInt(match[2], 10);
      const mod = match[3].toUpperCase();
      if (mod === 'PM' && hours !== 12) hours += 12;
      if (mod === 'AM' && hours === 12) hours = 0;
      const d = new Date(baseDate);
      d.setHours(hours, mins, 0, 0);
      return d;
    }
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? null : d;
  };

  let migratedCount = 0;
  let skippedCount = 0;

  for (const att of sourceAtts) {
    const u = rUserMap[att.userId?.toString()];
    
    // Find matching employee in Skite Prime
    let emp = null;
    if (u?.empId) {
      emp = employees.find(e => e.employeeId.toLowerCase() === u.empId.toLowerCase());
    }
    if (!emp && u?.email) {
      emp = employees.find(e => e.email.toLowerCase() === u.email.toLowerCase());
    }
    if (!emp && att.userName) {
      emp = employees.find(e => 
        (e.firstName + ' ' + (e.lastName || '')).trim().toLowerCase() === att.userName.trim().toLowerCase()
      );
    }
    if (!emp && u?.fullName) {
      emp = employees.find(e => 
        (e.firstName + ' ' + (e.lastName || '')).trim().toLowerCase() === u.fullName.trim().toLowerCase()
      );
    }

    if (!emp) {
      // Fallback: match by partial name or use first matching designation
      skippedCount++;
      continue;
    }

    // Parse date
    let dateObj = new Date();
    if (att.date && att.date.includes('/')) {
      const parts = att.date.split('/');
      dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
    } else if (att.createdAt) {
      dateObj = new Date(att.createdAt);
      dateObj.setUTCHours(0, 0, 0, 0);
    }

    const checkInTime = parseTimeToDate(dateObj, att.checkIn) || (att.createdAt ? new Date(att.createdAt) : dateObj);
    const checkOutTime = parseTimeToDate(dateObj, att.checkOut);

    // Calculate working minutes from duration (e.g. "8h 0m")
    let totalWorkingMinutes = 0;
    if (att.duration) {
      const hMatch = att.duration.match(/(\d+)h/);
      const mMatch = att.duration.match(/(\d+)m/);
      if (hMatch) totalWorkingMinutes += parseInt(hMatch[1], 10) * 60;
      if (mMatch) totalWorkingMinutes += parseInt(mMatch[1], 10);
    }

    const status = (att.status === 'Present' || (att.checkIn && att.checkIn !== '--')) ? 'Present' : 'Absent';

    const attendanceDoc = {
      tenantId: targetTenantId,
      employeeId: emp._id,
      date: dateObj,
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      status: status,
      totalWorkingMinutes: totalWorkingMinutes,
      notes: att.workSummary || att.taskSummary || '',
      createdAt: att.createdAt || dateObj,
      updatedAt: att.updatedAt || dateObj
    };

    await SAttendance.findOneAndUpdate(
      { tenantId: targetTenantId, employeeId: emp._id, date: dateObj },
      { $set: attendanceDoc },
      { upsert: true, returnDocument: 'after' }
    );
    migratedCount++;
  }

  console.log(`Migration Complete:`);
  console.log(`- Migrated ${migratedCount} employee attendances into Skite Prime.`);
  console.log(`- Skipped ${skippedCount} unlinked records.`);

  await rConn.close();
  await sConn.close();
  process.exit(0);
}

migrateEmployeeAttendance().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
