const mongoose = require('mongoose');
const CalendarEvent = require('./models/CalendarEvent');
const Tenant = require('./models/Tenant');

mongoose.connect('mongodb://127.0.0.1:27017/skitecrm')
    .then(async () => {
        const tenant = await Tenant.findOne();
        if (!tenant) {
            console.log('No tenant found.');
            process.exit();
        }
        
        const events = [
            { tenantId: tenant._id, title: 'Gandhi Jayanti', date: new Date(2026, 9, 2), type: 'Holiday', description: 'National Holiday' },
            { tenantId: tenant._id, title: 'Ayudha Pooja', date: new Date(2026, 9, 19), type: 'Holiday', description: 'Festival' },
            { tenantId: tenant._id, title: 'Vijaya Dashami', date: new Date(2026, 9, 20), type: 'Holiday', description: 'Festival' },
            { tenantId: tenant._id, title: 'Deepavali', date: new Date(2026, 10, 8), type: 'Holiday', description: 'Festival of Lights' },
            { tenantId: tenant._id, title: 'Company Townhall', date: new Date(2026, 9, 15), type: 'Meeting', description: 'Monthly All-Hands Meeting' },
            { tenantId: tenant._id, title: 'Project Skite Launch', date: new Date(2026, 9, 31), type: 'Event', description: 'Go-live for the new platform' },
            { tenantId: tenant._id, title: 'Quarterly Audit', date: new Date(2026, 9, 10), type: 'Meeting', description: 'Q3 Financial Audit' }
        ];

        // Clear existing events first
        await CalendarEvent.deleteMany({ tenantId: tenant._id });

        await CalendarEvent.insertMany(events);
        console.log('Seeded calendar events successfully!');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });



