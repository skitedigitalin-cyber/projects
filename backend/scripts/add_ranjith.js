const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Employee = require('../models/Employee');
const Tenant = require('../models/Tenant');

async function addRanjith() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to target DB');

  let tenant = await Tenant.findOne({ companyName: 'Skite Digital Agency' });
  if (!tenant) tenant = await Tenant.findOne({});

  const email = 'ranjithkumar120817@gmail.com';
  const rawName = 'Ranjith kumar';
  const firstName = 'Ranjith';
  const lastName = 'kumar';
  const employeeId = 'SKT-034';
  const passwordHash = '$2b$10$w0DHuMm1i2MhI0O4pS1XaeebeJEsAEvX.p9jpdrPwCgEwiopHFym6';

  // 1. User Account
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      tenantId: tenant._id,
      name: rawName,
      email: email,
      password: passwordHash,
      role: 'Designer',
      activeModules: ['dashboard', 'calendar', 'projects'],
      isActive: true
    });
    await user.save();
    console.log('User created:', user._id);
  } else {
    user.role = 'Designer';
    user.activeModules = ['dashboard', 'calendar', 'projects'];
    user.isActive = true;
    user.password = passwordHash;
    await user.save();
    console.log('User updated:', user._id);
  }

  // 2. Employee Profile
  let employee = await Employee.findOne({ email });
  if (!employee) {
    employee = new Employee({
      tenantId: tenant._id,
      userId: user._id,
      employeeId: employeeId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: '',
      department: 'Creative & UI Design',
      designation: 'Graphic Designer',
      role: 'Designer',
      shift: 'General',
      workLocation: 'Office',
      employmentType: 'Full-Time',
      dateOfJoining: new Date('2026-07-03'),
      salaryBasic: 0,
      perDaySalary: 0,
      panNumber: '',
      aadharNumber: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      status: 'Active'
    });
    await employee.save();
    console.log('Employee created:', employee.employeeId);
  } else {
    employee.tenantId = tenant._id;
    employee.userId = user._id;
    employee.employeeId = employeeId;
    employee.firstName = firstName;
    employee.lastName = lastName;
    employee.department = 'Creative & UI Design';
    employee.designation = 'Graphic Designer';
    employee.role = 'Designer';
    employee.dateOfJoining = new Date('2026-07-03');
    employee.status = 'Active';
    await employee.save();
    console.log('Employee updated:', employee.employeeId);
  }

  const allEmps = await Employee.find({ tenantId: tenant._id });
  const activeCount = allEmps.filter(e => e.status === 'Active').length;
  console.log(`Success! Total Employees: ${allEmps.length} | Active: ${activeCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

addRanjith().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
