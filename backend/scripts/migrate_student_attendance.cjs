const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function migrateStudentAttendance() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  const skiteUri = process.env.MONGO_URI;

  console.log('Connecting to Robotriq DB (READ ONLY)...');
  const rConn = await mongoose.createConnection(robotriqUri).asPromise();

  console.log('Connecting to Skite Prime DB...');
  const sConn = await mongoose.createConnection(skiteUri).asPromise();

  const targetTenantId = new mongoose.Types.ObjectId('6afd35731172da4b0de9a48e');

  const RAttendance = rConn.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const RUser = rConn.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = sConn.model('Student', require('../models/Student').schema);
  const StudentAttendance = sConn.model('StudentAttendance', require('../models/StudentAttendance').schema);

  const studentsInSkite = await Student.find({ tenantId: targetTenantId }).lean();
  console.log(`Students in Skite Prime: ${studentsInSkite.length}`);

  // Fetch all 34 student attendances from Robotriq (READ ONLY)
  const sourceAtts = await RAttendance.find({ role: 'student' }).lean();
  console.log(`Found ${sourceAtts.length} student attendances in Robotriq.`);

  let count = 0;
  for (const item of sourceAtts) {
    // Find matching student
    const studentName = (item.userName || item.fullName || 'Student').trim();
    const matchedStu = studentsInSkite.find(s => 
      s.fullName.trim().toLowerCase() === studentName.toLowerCase() ||
      s.studentId.trim().toLowerCase() === (item.studentId || '').trim().toLowerCase()
    );

    let dateStr = item.date || '';
    let dateObj = item.createdAt ? new Date(item.createdAt) : new Date();
    if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(parsed.getTime())) dateObj = parsed;
    }

    const doc = {
      tenantId: targetTenantId,
      studentId: matchedStu ? matchedStu._id : undefined,
      studentCode: matchedStu ? matchedStu.studentId : (item.studentId || ''),
      studentName: studentName,
      course: matchedStu ? matchedStu.course : (item.course || ''),
      date: dateStr || dateObj.toLocaleDateString('en-GB'),
      dateObj: dateObj,
      checkIn: item.checkIn || '--',
      checkOut: item.checkOut || '--',
      duration: item.duration || '0h 0m',
      status: (item.status === 'Present' || (item.checkIn && item.checkIn !== '--')) ? 'Present' : 'Absent',
      workSummary: item.workSummary || item.taskSummary || '',
      createdAt: item.createdAt || dateObj,
      updatedAt: item.updatedAt || dateObj
    };

    // Upsert to prevent duplicate on re-run
    await StudentAttendance.findOneAndUpdate(
      { 
        tenantId: targetTenantId, 
        studentName: doc.studentName, 
        date: doc.date,
        checkIn: doc.checkIn
      },
      { $set: doc },
      { upsert: true, returnDocument: 'after' }
    );
    count++;
  }

  console.log(`Successfully migrated ${count} student attendance records into Skite Prime!`);

  await rConn.close();
  await sConn.close();
  process.exit(0);
}

migrateStudentAttendance().catch(err => {
  console.error(err);
  process.exit(1);
});
