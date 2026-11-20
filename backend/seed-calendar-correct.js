const mongoose = require('mongoose');
const CalendarEvent = require('./models/CalendarEvent');

mongoose.connect('mongodb://127.0.0.1:27017/merndb')
    .then(async () => {
        const tenantIdStr = '6ab9ef207dce5f1aac8008d5';
        const tenantId = new mongoose.Types.ObjectId(tenantIdStr);
        
        const events = [
            { tenantId, title: 'Gandhi Jayanti', date: new Date(2026, 9, 2), type: 'Holiday', description: 'National Holiday' },
            { tenantId, title: 'Ayudha Pooja', date: new Date(2026, 9, 19), type: 'Holiday', description: 'Festival' },
            { tenantId, title: 'Vijaya Dashami', date: new Date(2026, 9, 20), type: 'Holiday', description: 'Festival' },
            { tenantId, title: 'Deepavali', date: new Date(2026, 10, 8), type: 'Holiday', description: 'Festival of Lights' },
            { tenantId, title: 'Company Townhall', date: new Date(2026, 9, 15), type: 'Meeting', description: 'Monthly All-Hands Meeting' },
            { tenantId, title: 'Project Skite Launch', date: new Date(2026, 9, 31), type: 'Event', description: 'Go-live for the new platform' },
            { tenantId, title: 'Quarterly Audit', date: new Date(2026, 9, 10), type: 'Meeting', description: 'Q3 Financial Audit' }
        ];

        // Clear existing events for this tenant first
        await CalendarEvent.deleteMany({ tenantId });

        await CalendarEvent.insertMany(events);
        console.log('Seeded calendar events successfully for correct tenant!');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

