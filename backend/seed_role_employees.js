require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Employee = require('./models/Employee');

async function seedRoleEmployees() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        const tenantId = new mongoose.Types.ObjectId('6ab9ef207dce5f1aac8008d5');

        // 1. Upgrade tenant to Growth/Active with 25 employees limit so all roles fit comfortably
        await Tenant.findByIdAndUpdate(tenantId, {
            status: 'active',
            subscriptionPlan: 'Growth',
            maxEmployees: 25
        });
        console.log('Tenant upgraded to active Growth plan with 25 employee seats');

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = 'Password@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // 2. Define the employee list covering ALL roles
        const roleEmployees = [
            {
                employeeId: '123', // existing
                firstName: 'subramani',
                lastName: 'S',
                email: 'subramanidev2003@gmail.com',
                phone: '9025568008',
                department: 'Content Creation',
                designation: 'Senior Content Writer',
                role: 'Content writter',
                activeModules: ['dashboard', 'calendar', 'projects']
            },
            {
                employeeId: 'EMP-SEO-01', // existing Karthik, activate him!
                firstName: 'Karthik',
                lastName: 'R',
                email: 'test.seo@acme.com',
                phone: '9876543210',
                department: 'Digital Marketing',
                designation: 'SEO & Growth Specialist',
                role: 'SEO analyst',
                activeModules: ['dashboard', 'calendar', 'projects', 'sales']
            },
            {
                employeeId: 'EMP-VDO-02',
                firstName: 'Suresh',
                lastName: 'Kumar',
                email: 'suresh.shoot@acme.com',
                phone: '9876543211',
                department: 'Media Production',
                designation: 'Chief Videographer & Shooter',
                role: 'Videographer',
                activeModules: ['dashboard', 'calendar', 'projects']
            },
            {
                employeeId: 'EMP-EDT-03',
                firstName: 'Ramesh',
                lastName: 'V',
                email: 'ramesh.edit@acme.com',
                phone: '9876543212',
                department: 'Post Production',
                designation: 'Senior Video Editor',
                role: 'video editor',
                activeModules: ['dashboard', 'calendar', 'projects']
            },
            {
                employeeId: 'EMP-DSG-04',
                firstName: 'Anitha',
                lastName: 'M',
                email: 'anitha.design@acme.com',
                phone: '9876543213',
                department: 'Creative Design',
                designation: 'Graphic & UI Designer',
                role: 'Designer',
                activeModules: ['dashboard', 'calendar', 'projects']
            },
            {
                employeeId: 'EMP-DEV-05',
                firstName: 'Dinesh',
                lastName: 'K',
                email: 'dinesh.dev@acme.com',
                phone: '9876543214',
                department: 'Engineering',
                designation: 'Full Stack Web Developer',
                role: 'web developer',
                activeModules: ['dashboard', 'calendar', 'projects']
            },
            {
                employeeId: 'EMP-MGR-06',
                firstName: 'Priya',
                lastName: 'S',
                email: 'priya.manager@acme.com',
                phone: '9876543215',
                department: 'Operations & Delivery',
                designation: 'Production & Team Manager',
                role: 'manager',
                activeModules: ['dashboard', 'calendar', 'sales', 'finance', 'hr', 'projects']
            },
            {
                employeeId: 'EMP-STF-07',
                firstName: 'Vijay',
                lastName: 'Anand',
                email: 'vijay.staff@acme.com',
                phone: '9876543216',
                department: 'Operations',
                designation: 'General Operations Associate',
                role: 'Employee',
                activeModules: ['dashboard', 'calendar', 'projects']
            }
        ];

        console.log('\n--- Creating / Syncing Role Employees ---');
        const results = [];

        for (const item of roleEmployees) {
            const normalizedEmail = item.email.toLowerCase().trim();

            // Find or create User
            let user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                user = new User({
                    tenantId,
                    name: `${item.firstName} ${item.lastName}`.trim(),
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: item.role,
                    activeModules: item.activeModules,
                    isActive: true
                });
                await user.save();
                console.log(`✓ Created User: ${item.firstName} (${item.role}) -> ${normalizedEmail}`);
            } else {
                user.role = item.role;
                user.password = hashedPassword;
                user.activeModules = item.activeModules;
                user.isActive = true;
                await user.save();
                console.log(`↻ Updated User: ${item.firstName} (${item.role}) -> ${normalizedEmail}`);
            }

            // Find or create Employee
            let emp = await Employee.findOne({ 
                tenantId, 
                $or: [{ email: normalizedEmail }, { employeeId: item.employeeId }] 
            });

            if (!emp) {
                emp = new Employee({
                    tenantId,
                    userId: user._id,
                    employeeId: item.employeeId,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    email: normalizedEmail,
                    phone: item.phone,
                    department: item.department,
                    designation: item.designation,
                    role: item.role,
                    shift: 'General',
                    workLocation: 'Office',
                    employmentType: 'Full-Time',
                    dateOfJoining: new Date('2026-01-01'),
                    perDaySalary: 1200,
                    salaryBasic: 30000,
                    status: 'Active'
                });
                await emp.save();
                console.log(`✓ Created Employee: ${item.firstName} ${item.lastName} [${item.employeeId}]`);
            } else {
                emp.userId = user._id;
                emp.firstName = item.firstName;
                emp.lastName = item.lastName;
                emp.email = normalizedEmail;
                emp.role = item.role;
                emp.designation = item.designation;
                emp.department = item.department;
                emp.status = 'Active';
                await emp.save();
                console.log(`↻ Updated Employee: ${item.firstName} ${item.lastName} [${item.employeeId}] -> Active`);
            }

            results.push({
                Role: item.role,
                Name: `${item.firstName} ${item.lastName}`,
                Email: normalizedEmail,
                Password: defaultPassword,
                EmployeeId: item.employeeId,
                Department: item.department
            });
        }

        console.log('\n======================================================');
        console.log('ALL ROLE EMPLOYEES READY:');
        console.table(results);
        console.log('======================================================');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding role employees:', err);
        process.exit(1);
    }
}

seedRoleEmployees();
