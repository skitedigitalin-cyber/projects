const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const WebDevProject = require('../models/WebDevProject');
const SEOProject = require('../models/SEOProject');
const SocialMediaProject = require('../models/SocialMediaProject');
const Task = require('../models/Task');

const ECOMM_CHECKLIST = [
    'Domain purchasing & Hosting',
    'Requirement understanding and Wireframing',
    'Homepage structure and Design',
    'Product listing page',
    'Product detailed page',
    'Collection pages and filters',
    'Cart & Checkout process',
    'Payment gateway integration',
    'Product upload & categorization',
    'Inventory setup',
    'Responsive design (Mobile / Tablet)',
    'Banner & graphic design',
    'Contact Us, About Us, Policies page',
    'Social media & WhatsApp chat integration',
    'On-Page SEO setup',
    'Testing speed, performance, and cross-browser testing',
    'Handover & Client training'
];

const SEO_MASTER_CATEGORIES = [
    {
        category: 'Keyword Research & Technical SEO',
        tasks: [
            'Identify primary keyword (main topic)',
            'Find secondary and long-tail keywords',
            'Analyze search intent',
            'Check keyword difficulty and search volume',
            'Perform competitor keyword analysis',
            'Website loads fast (<3 seconds)',
            'Mobile-friendly',
            'HTTPS enabled (SSL)',
            'Fix broken links (404)',
            'Create XML sitemap',
            'Submit sitemap in GSC',
            'Create Google Search Console',
            'Use robots.txt correctly',
            'Canonical tags',
            'Structured data (Schema)',
            'Integrate GSC and GA',
            'Index all pages'
        ]
    },
    {
        category: 'Content & On-Page SEO',
        tasks: [
            'Target one main keyword per page',
            'Write for user intent',
            'Use short paragraphs & headings (H2, H3)',
            'Add internal links',
            'Add external links to trusted sources',
            'Match content length with competitors',
            'Optimize meta title & description',
            'Use short, clean URLs',
            'Avoid numbers/special chars in URL',
            'Descriptive file names',
            'Add ALT text with keywords',
            'Compress images',
            'Publish 4 blog posts/month'
        ]
    },
    {
        category: 'Off-Page SEO Tasks',
        tasks: [
            'Build high-quality backlinks',
            'Perform guest posting',
            'Submit to directories',
            'Do social bookmarking',
            'Conduct influencer outreach',
            'Avoid spammy links',
            'Track traffic and behavior',
            'Monitor keyword rankings',
            'Continually create backlinks'
        ]
    },
    {
        category: 'Local SEO Tasks',
        tasks: [
            'Create/Optimize Google Business Profile',
            'Maintain NAP consistency',
            'Collect customer reviews',
            'Use location-based keywords',
            'List in local directories',
            'Publish 2 posts per week',
            'Monitor Performance'
        ]
    }
];

async function seed(targetUri) {
    const mongoUri = targetUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merndb';
    console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^@]+)@/, ':****@')} ...`);
    
    await mongoose.connect(mongoUri);
    console.log('Connected successfully!');

    // 1. Create Tenant (Active Enterprise)
    let tenant = await Tenant.findOne({ subDomain: 'skitedigital' });
    if (!tenant) {
        tenant = new Tenant({
            companyName: 'Skite Digital Agency',
            subDomain: 'skitedigital',
            subscriptionPlan: 'Enterprise',
            status: 'active',
            validUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
            maxEmployees: 9999,
            maxLeads: 9999,
            maxInvoices: 9999,
            activeModules: ['dashboard', 'sales', 'finance', 'hr', 'projects', 'calendar']
        });
        await tenant.save();
        console.log('Created Tenant: Skite Digital Agency');
    } else {
        tenant.status = 'active';
        tenant.validUntil = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);
        await tenant.save();
        console.log('Updated Tenant: Skite Digital Agency (Active)');
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('admin123', salt);

    // 2. Create CEO Account (Support both ceo@skite.com and ceo@skiteprime.com)
    for (let ceoEmail of ['ceo@skite.com', 'ceo@skiteprime.com']) {
        let ceo = await User.findOne({ email: ceoEmail });
        if (!ceo) {
            ceo = new User({
                tenantId: tenant._id,
                name: 'Chief Executive Officer',
                email: ceoEmail,
                password: defaultHashedPassword,
                role: 'CEO',
                activeModules: ['dashboard', 'sales', 'finance', 'hr', 'projects', 'calendar']
            });
            await ceo.save();
            console.log(`Created CEO: ${ceoEmail} / admin123`);
        } else {
            ceo.password = defaultHashedPassword;
            await ceo.save();
            console.log(`Updated CEO: ${ceoEmail} / admin123`);
        }
    }

    // 3. Create Admin Account
    let admin = await User.findOne({ email: 'admin@skite.com' });
    if (!admin) {
        admin = new User({
            tenantId: tenant._id,
            name: 'Skite Super Admin',
            email: 'admin@skite.com',
            password: defaultHashedPassword,
            role: 'Admin',
            activeModules: ['dashboard', 'sales', 'finance', 'hr', 'projects', 'calendar']
        });
        await admin.save();
        console.log('Created Admin: admin@skite.com / admin123');
    }

    // 4. Employees Definition (One for Every Role)
    const employeeDefinitions = [
        {
            firstName: 'Sanjay',
            lastName: 'Kumar',
            email: 'writer@skite.com',
            role: 'Content writter',
            department: 'Content Creation',
            designation: 'Lead Script Writer',
            employeeId: 'SKT-CW01',
            shift: 'General',
            perDaySalary: 1200,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Suresh',
            lastName: 'Raj',
            email: 'videographer@skite.com',
            role: 'Videographer',
            department: 'Media Production',
            designation: 'Senior Videographer',
            employeeId: 'SKT-VG01',
            shift: 'General',
            perDaySalary: 1300,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Ramesh',
            lastName: 'V',
            email: 'editor@skite.com',
            role: 'video editor',
            department: 'Post Production',
            designation: 'Lead Video Editor',
            employeeId: 'SKT-VE01',
            shift: 'General',
            perDaySalary: 1400,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Anitha',
            lastName: 'M',
            email: 'designer@skite.com',
            role: 'Designer',
            department: 'Creative Design',
            designation: 'Graphic & UI Designer',
            employeeId: 'SKT-DS01',
            shift: 'General',
            perDaySalary: 1250,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Dinesh',
            lastName: 'K',
            email: 'webdev@skite.com',
            role: 'web developer',
            department: 'Engineering',
            designation: 'Full Stack Web Developer',
            employeeId: 'SKT-WD01',
            shift: 'General',
            perDaySalary: 1600,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Karthik',
            lastName: 'R',
            email: 'seo@skite.com',
            role: 'SEO analyst',
            department: 'Digital Marketing',
            designation: 'Senior SEO Analyst',
            employeeId: 'SKT-SEO01',
            shift: 'General',
            perDaySalary: 1350,
            activeModules: ['projects', 'calendar']
        },
        {
            firstName: 'Pooja',
            lastName: 'Sharma',
            email: 'sales@skite.com',
            role: 'Sales',
            department: 'Sales & Marketing',
            designation: 'Sales Executive',
            employeeId: 'SKT-SL01',
            shift: 'General',
            perDaySalary: 1100,
            activeModules: ['sales', 'dashboard', 'calendar']
        },
        {
            firstName: 'Venkatesh',
            lastName: 'P',
            email: 'finance@skite.com',
            role: 'Finance',
            department: 'Finance & Accounts',
            designation: 'Finance Lead',
            employeeId: 'SKT-FN01',
            shift: 'General',
            perDaySalary: 1500,
            activeModules: ['finance', 'dashboard', 'calendar']
        },
        {
            firstName: 'Meena',
            lastName: 'S',
            email: 'hr@skite.com',
            role: 'HR',
            department: 'Human Resources',
            designation: 'HR Manager',
            employeeId: 'SKT-HR01',
            shift: 'General',
            perDaySalary: 1450,
            activeModules: ['hr', 'dashboard', 'calendar']
        },
        {
            firstName: 'Rajesh',
            lastName: 'Kannan',
            email: 'manager@skite.com',
            role: 'manager',
            department: 'Operations',
            designation: 'Operations Manager',
            employeeId: 'SKT-MG01',
            shift: 'General',
            perDaySalary: 1800,
            activeModules: ['dashboard', 'sales', 'projects', 'hr', 'calendar']
        },
        {
            firstName: 'Saravanan',
            lastName: 'T',
            email: 'employee@skite.com',
            role: 'Employee',
            department: 'Operations',
            designation: 'Operations Executive',
            employeeId: 'SKT-EM01',
            shift: 'General',
            perDaySalary: 1000,
            activeModules: ['projects', 'calendar']
        }
    ];

    const createdEmployees = {};

    for (let empData of employeeDefinitions) {
        // Ensure User account exists
        let user = await User.findOne({ email: empData.email });
        if (!user) {
            user = new User({
                tenantId: tenant._id,
                name: `${empData.firstName} ${empData.lastName}`,
                email: empData.email,
                password: defaultHashedPassword,
                role: empData.role,
                activeModules: empData.activeModules
            });
            await user.save();
        } else {
            user.tenantId = tenant._id;
            user.role = empData.role;
            user.activeModules = empData.activeModules;
            await user.save();
        }

        // Ensure Employee record exists
        let emp = await Employee.findOne({ tenantId: tenant._id, employeeId: empData.employeeId });
        if (!emp) {
            emp = new Employee({
                tenantId: tenant._id,
                userId: user._id,
                employeeId: empData.employeeId,
                firstName: empData.firstName,
                lastName: empData.lastName,
                email: empData.email,
                phone: '+91 98765 43210',
                department: empData.department,
                designation: empData.designation,
                role: empData.role,
                shift: empData.shift,
                dateOfJoining: new Date('2026-01-01'),
                perDaySalary: empData.perDaySalary,
                status: 'Active'
            });
            await emp.save();
            console.log(`Created Employee: [${empData.role}] ${empData.firstName} ${empData.lastName} (${empData.email})`);
        } else {
            emp.userId = user._id;
            emp.role = empData.role;
            emp.department = empData.department;
            emp.designation = empData.designation;
            await emp.save();
            console.log(`Updated Employee: [${empData.role}] ${empData.firstName} ${empData.lastName}`);
        }

        createdEmployees[empData.role] = emp;
    }

    // 5. Create Demo WebDev Project for Dinesh K (web developer)
    const webDevEmp = createdEmployees['web developer'];
    if (webDevEmp) {
        let webProj = await WebDevProject.findOne({ tenantId: tenant._id, businessName: 'skitedigital' });
        if (!webProj) {
            webProj = new WebDevProject({
                tenantId: tenant._id,
                clientName: 'Bala Chandran',
                businessName: 'skitedigital',
                phone: '+91 98765 43210',
                email: 'contact@skitedigital.com',
                website: 'https://skitedigital.com',
                websiteType: 'E-Commerce',
                assignedDeveloper: webDevEmp._id,
                projectStatus: 'In Progress',
                clientStatus: 'Active',
                checklist: ECOMM_CHECKLIST.map(item => ({ item, status: 'Pending' }))
            });
            await webProj.save();
            console.log('Created WebDev Project: skitedigital for web developer Dinesh K');
        } else {
            webProj.assignedDeveloper = webDevEmp._id;
            if (!webProj.checklist || webProj.checklist.length === 0) {
                webProj.checklist = ECOMM_CHECKLIST.map(item => ({ item, status: 'Pending' }));
            }
            await webProj.save();
        }

        // Create Task for Web Dev
        let webTask = await Task.findOne({ tenantId: tenant._id, employeeId: webDevEmp._id, title: /\[Web Dev\]/i });
        if (!webTask) {
            webTask = new Task({
                tenantId: tenant._id,
                employeeId: webDevEmp._id,
                assignedBy: admin._id,
                projectId: webProj._id,
                title: '[Web Dev] skitedigital (E-Commerce)',
                description: 'Client: skitedigital\nType: E-Commerce\nWebsite: https://skitedigital.com\nMilestone checklist ready to complete.',
                priority: 'High',
                dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                status: 'Pending'
            });
            await webTask.save();
            console.log('Created Task for Web Developer Dinesh K');
        }
    }

    // 6. Create Demo SEO Project for Karthik R (SEO analyst)
    const seoEmp = createdEmployees['SEO analyst'];
    if (seoEmp) {
        let seoProj = await SEOProject.findOne({ tenantId: tenant._id, businessName: 'skitedigital' });
        if (!seoProj) {
            const checklist = [];
            SEO_MASTER_CATEGORIES.forEach(catObj => {
                catObj.tasks.forEach(tName => {
                    checklist.push({
                        category: catObj.category,
                        taskName: tName,
                        isCompleted: false
                    });
                });
            });

            seoProj = new SEOProject({
                tenantId: tenant._id,
                clientName: 'Bala Chandran',
                businessName: 'skitedigital',
                phone: '+91 98765 43210',
                email: 'contact@skitedigital.com',
                website: 'https://skitedigital.com',
                assignedSpecialist: seoEmp._id,
                projectStatus: 'In Progress',
                clientStatus: 'Active',
                checklist
            });
            await seoProj.save();
            console.log('Created SEO Project: skitedigital for SEO analyst Karthik R');
        } else {
            seoProj.assignedSpecialist = seoEmp._id;
            await seoProj.save();
        }

        // Create Task for SEO
        let seoTask = await Task.findOne({ tenantId: tenant._id, employeeId: seoEmp._id, title: /\[SEO Project\]/i });
        if (!seoTask) {
            seoTask = new Task({
                tenantId: tenant._id,
                employeeId: seoEmp._id,
                assignedBy: admin._id,
                projectId: seoProj._id,
                title: '[SEO Project] skitedigital',
                description: 'Client: skitedigital\nWebsite: https://skitedigital.com\n46-Point Master Checklist ready to execute.',
                priority: 'High',
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                status: 'Pending'
            });
            await seoTask.save();
            console.log('Created Task for SEO Analyst Karthik R');
        }
    }

    // 7. Create Demo Social Media Project with content items
    const writerEmp = createdEmployees['Content writter'];
    const vgEmp = createdEmployees['Videographer'];
    const veEmp = createdEmployees['video editor'];

    let smProj = await SocialMediaProject.findOne({ tenantId: tenant._id, businessName: 'Skite Digital Agency' });
    if (!smProj) {
        smProj = new SocialMediaProject({
            tenantId: tenant._id,
            clientName: 'Bala Chandran',
            businessName: 'Skite Digital Agency',
            phone: '+91 98765 43210',
            email: 'contact@skitedigital.com',
            month: 'October 2026',
            status: 'Active',
            contentItems: []
        });

        // 1. Script Item
        if (writerEmp) {
            const t1 = new Task({
                tenantId: tenant._id,
                employeeId: writerEmp._id,
                assignedBy: admin._id,
                title: '[Skite Digital Agency (Bala Chandran)] - Reel Script Writing',
                description: `Business Name: Skite Digital Agency\nClient Contact Name: Bala Chandran\nStage: Script\nTarget Date: 2026-10-20\nDetails & Instructions: Write script for launch reel.`,
                priority: 'High',
                dueDate: new Date('2026-10-20'),
                status: 'Pending'
            });
            await t1.save();
            smProj.contentItems.push({
                type: 'Script',
                date: new Date('2026-10-20'),
                details: 'Write script for launch reel.',
                status: 'Pending',
                assignedEmployee: writerEmp._id,
                assignedTaskId: t1._id
            });
        }

        // 2. Shoot Item
        if (vgEmp) {
            const t2 = new Task({
                tenantId: tenant._id,
                employeeId: vgEmp._id,
                assignedBy: admin._id,
                title: '[Skite Digital Agency (Bala Chandran)] - Reel Video Shooting',
                description: `Business Name: Skite Digital Agency\nClient Contact Name: Bala Chandran\nStage: Shoot\nTarget Date: 2026-10-22\nTime: 11:00 AM\nDetails & Instructions: Shoot high resolution office scenes.`,
                priority: 'High',
                dueDate: new Date('2026-10-22'),
                status: 'Pending'
            });
            await t2.save();
            smProj.contentItems.push({
                type: 'Shoot',
                date: new Date('2026-10-22'),
                startTime: '11:00 AM',
                details: 'Shoot high resolution office scenes.',
                status: 'Pending',
                assignedEmployee: vgEmp._id,
                assignedTaskId: t2._id
            });
        }

        // 3. Edit Item
        if (veEmp) {
            const t3 = new Task({
                tenantId: tenant._id,
                employeeId: veEmp._id,
                assignedBy: admin._id,
                title: '[Skite Digital Agency (Bala Chandran)] - Reel Video Editing',
                description: `Business Name: Skite Digital Agency\nClient Contact Name: Bala Chandran\nStage: Edit\nTarget Date: 2026-10-24\nDetails & Instructions: Add clean transitions, subtitles, and background music.`,
                priority: 'High',
                dueDate: new Date('2026-10-24'),
                status: 'Pending'
            });
            await t3.save();
            smProj.contentItems.push({
                type: 'Edit',
                date: new Date('2026-10-24'),
                details: 'Add clean transitions, subtitles, and background music.',
                status: 'Pending',
                assignedEmployee: veEmp._id,
                assignedTaskId: t3._id
            });
        }

        // 4. Post Item
        if (seoEmp) {
            const t4 = new Task({
                tenantId: tenant._id,
                employeeId: seoEmp._id,
                assignedBy: admin._id,
                title: '[Skite Digital Agency (Bala Chandran)] - Social Media Publishing',
                description: `Business Name: Skite Digital Agency\nClient Contact Name: Bala Chandran\nStage: Post\nTarget Date: 2026-10-25\nTime: 06:00 PM\nDetails & Instructions: Publish video across Instagram and LinkedIn.`,
                priority: 'High',
                dueDate: new Date('2026-10-25'),
                status: 'Pending'
            });
            await t4.save();
            smProj.contentItems.push({
                type: 'Post',
                date: new Date('2026-10-25'),
                startTime: '06:00 PM',
                details: 'Publish video across Instagram and LinkedIn.',
                status: 'Pending',
                assignedEmployee: seoEmp._id,
                assignedTaskId: t4._id
            });
        }

        await smProj.save();
        console.log('Created Social Media Project: Skite Digital Agency with Script, Shoot, Edit, and Post items');
    }

    console.log('\n======================================================');
    console.log('🎉🎉🎉 SEEDING COMPLETED SUCCESSFULLY! 🎉🎉🎉');
    console.log('======================================================');
    console.log('Default Password for all accounts: admin123');
    console.log('\n👑 CEO Account:');
    console.log('   Email: ceo@skite.com | Pass: admin123');
    console.log('\n🛡️ Admin Account:');
    console.log('   Email: admin@skite.com | Pass: admin123');
    console.log('\n👥 Employee Accounts:');
    employeeDefinitions.forEach(e => {
        console.log(`   - [${e.role.padEnd(15)}] ${e.email.padEnd(25)} | Name: ${e.firstName} ${e.lastName}`);
    });
    console.log('======================================================\n');

    process.exit(0);
}

if (require.main === module) {
    const targetUri = process.argv[2];
    seed(targetUri).catch(err => {
        console.error('Seeding error:', err);
        process.exit(1);
    });
}

module.exports = seed;
