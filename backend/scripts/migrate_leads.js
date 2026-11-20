const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM';
const TARGET_URI = 'mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm';
const TENANT_ID = new mongoose.Types.ObjectId('6af2c94a9d29730751ed2d01');

async function migrateLeads() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('--- Connecting to Source & Target DBs ---');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to both databases successfully.');

        const sourceColl = sourceConn.collection('leads');
        const targetColl = targetConn.collection('leads');

        const sourceLeads = await sourceColl.find({}).toArray();
        console.log(`Found ${sourceLeads.length} leads in source database.`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < sourceLeads.length; i++) {
            const doc = sourceLeads[i];

            // Map Lead Source: 'Cold' -> 'Cold Leads', 'Meta' -> 'Meta Leads'
            let mappedSource = 'Other';
            if (doc.leadSource === 'Cold') {
                mappedSource = 'Cold Leads';
            } else if (doc.leadSource === 'Meta') {
                mappedSource = 'Meta Leads';
            } else if (doc.leadSource) {
                mappedSource = doc.leadSource;
            }

            // Map Status & Stage:
            let mappedStatus = 'New';
            if (doc.leadStage === 'Qualified') {
                mappedStatus = 'Qualified';
            } else if (doc.leadStage === 'Appointment') {
                mappedStatus = 'Appointment';
            } else if (doc.leadStage === 'Lead') {
                if (doc.callStatus === 'Rejected') {
                    mappedStatus = 'Lost';
                } else if (doc.callStatus && (doc.callStatus.startsWith('Callback') || doc.callStatus === 'Not Attend')) {
                    mappedStatus = 'Contacted';
                } else {
                    mappedStatus = 'New';
                }
            }

            // Map Priority to temperature:
            let mappedTemp = 'Cold';
            if (doc.priority === 'High') mappedTemp = 'Hot';
            else if (doc.priority === 'Medium') mappedTemp = 'Warm';
            else if (doc.priority === 'Low') mappedTemp = 'Cold';

            // Generate clean lead ID: SKT-LD-001, SKT-LD-002, ...
            const leadNum = String(i + 1).padStart(3, '0');
            const leadId = `SKT-LD-${leadNum}`;

            const targetLeadDoc = {
                tenantId: TENANT_ID,
                leadId: leadId,
                customerName: (doc.name || 'Unnamed Lead').trim(),
                companyName: (doc.companyName || '').trim(),
                mobileNumber: (doc.phoneNumber || '').trim(),
                whatsappNumber: (doc.whatsappNumber || '').trim(),
                email: (doc.email || '').trim(),
                location: (doc.location || '').trim(),
                industry: (doc.business || '').trim(),
                leadSource: mappedSource,
                productServiceInterested: (doc.serviceType || '').trim(),
                serviceType: (doc.serviceType || '').trim(),
                leadValue: Number(doc.leadValue) || 0,
                leadStatus: mappedStatus,
                leadStage: doc.leadStage || 'Lead',
                callStatus: doc.callStatus || 'Lead',
                callbackAlertDate: doc.callbackAlertDate || '',
                callbackAlertTime: doc.callbackAlertTime || '',
                callback1Description: doc.callback1Description || '',
                callback2Description: doc.callback2Description || '',
                callback3Description: doc.callback3Description || '',
                callback4Description: doc.callback4Description || '',
                callback5Description: doc.callback5Description || '',
                rejectReason: doc.rejectReason || '',
                rejectedFromStage: doc.rejectedFrom || '',
                qualifiedDetails: doc.qualifiedDetails || '',
                qualifiedNotes: doc.qualifiedNotes || '',
                qualifiedAlertDate: doc.qualifiedAlertDate || '',
                qualifiedAlertTime: doc.qualifiedAlertTime || '',
                appointmentDetails: doc.appointmentDetails || '',
                appointmentNotes: doc.appointmentNotes || '',
                appointmentAlertDate: doc.appointmentAlertDate || '',
                appointmentAlertTime: doc.appointmentAlertTime || '',
                followUpStatus: doc.followUpStatus || '',
                followUpResponsibility: doc.followUpResponsibility || '',
                remainder2: doc.remainder2 || '',
                remainder2Date: doc.remainder2Date || '',
                remainder2Status: doc.remainder2Status || 'Pending',
                orderStatus: doc.orderStatus || 'Open',
                closing: doc.closing || 'No',
                callHistory: doc.callHistory || [],
                leadTemperature: mappedTemp,
                date: doc.date || '',
                createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
                sourceDbOriginalId: doc._id.toString()
            };

            // Avoid duplicate by checking sourceDbOriginalId or mobileNumber+customerName
            const existing = await targetColl.findOne({
                tenantId: TENANT_ID,
                $or: [
                    { sourceDbOriginalId: doc._id.toString() },
                    { customerName: targetLeadDoc.customerName, mobileNumber: targetLeadDoc.mobileNumber }
                ]
            });

            if (existing) {
                skippedCount++;
            } else {
                await targetColl.insertOne(targetLeadDoc);
                insertedCount++;
            }
        }

        console.log(`\n🎉 Migration Complete:`);
        console.log(`   - Total Source Leads: ${sourceLeads.length}`);
        console.log(`   - Inserted: ${insertedCount}`);
        console.log(`   - Skipped (already existed): ${skippedCount}`);

        const finalTotal = await targetColl.countDocuments({ tenantId: TENANT_ID });
        console.log(`   - Total leads now in Skite Digital Agency: ${finalTotal}`);

        const breakdown = await targetColl.aggregate([
            { $match: { tenantId: TENANT_ID } },
            { $group: { _id: "$leadSource", count: { $sum: 1 } } }
        ]).toArray();
        console.log(`\n   - By Lead Source:`, breakdown);

        const stageBreakdown = await targetColl.aggregate([
            { $match: { tenantId: TENANT_ID } },
            { $group: { _id: "$leadStatus", count: { $sum: 1 } } }
        ]).toArray();
        console.log(`   - By Lead Status:`, stageBreakdown);

        await sourceConn.close();
        await targetConn.close();
        console.log('✅ Done!');
    } catch (err) {
        console.error('Migration error:', err);
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
    }
}

migrateLeads();
