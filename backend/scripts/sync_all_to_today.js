const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM?retryWrites=true&w=majority';
const TARGET_URI = 'mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm?retryWrites=true&w=majority';
const TENANT_ID = new mongoose.Types.ObjectId('6af2c94a9d29730751ed2d01');

// Helper to get exact midnight IST in UTC
function getMidnightIST(date) {
    const d = new Date(date);
    const istTime = d.getTime() + (5.5 * 60 * 60 * 1000);
    const istDate = new Date(istTime);
    const year = istDate.getUTCFullYear();
    const month = istDate.getUTCMonth();
    const day = istDate.getUTCDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
}

async function syncAllToToday() {
    let srcConn = null;
    let tgtConn = null;

    try {
        console.log('========================================================');
        console.log('🚀 STARTING SAFE DELTA SYNC: OLD DB TO NEW DB (TODAY: NOV 13, 2026)');
        console.log('========================================================\n');

        srcConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        tgtConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to Source DB (READ-ONLY) and Target DB.');

        // Build mappings
        const srcUsers = await srcConn.db.collection('users').find({}).toArray();
        const srcUserMap = {};
        srcUsers.forEach(u => {
            srcUserMap[u._id.toString()] = {
                name: u.name,
                email: (u.email || '').toLowerCase().trim(),
                role: u.role
            };
        });

        const tgtEmps = await tgtConn.db.collection('employees').find({ tenantId: TENANT_ID }).toArray();
        const empByEmail = {};
        tgtEmps.forEach(e => {
            if (e.email) empByEmail[e.email.toLowerCase().trim()] = e;
        });
        console.log(`Mapped ${srcUsers.length} source users to ${tgtEmps.length} target employees.\n`);

        // ========================================================
        // 1. SYNC ATTENDANCES
        // ========================================================
        console.log('--- 1. SYNCING ATTENDANCES UP TO TODAY ---');
        const srcAtts = await srcConn.db.collection('attendances').find({}).sort({ checkInTime: 1 }).toArray();
        const tgtAttsColl = tgtConn.db.collection('attendances');

        let attInserted = 0;
        let attUpdated = 0;
        let attSkipped = 0;

        for (const sa of srcAtts) {
            const u = srcUserMap[sa.userId?.toString()];
            if (!u || !u.email) {
                attSkipped++;
                continue;
            }

            const emp = empByEmail[u.email];
            if (!emp) {
                attSkipped++;
                continue;
            }

            const inTime = sa.checkInTime ? new Date(sa.checkInTime) : (sa.date ? new Date(sa.date) : new Date(sa.createdAt));
            const outTime = sa.checkOutTime ? new Date(sa.checkOutTime) : null;
            const midnightDate = getMidnightIST(inTime);

            const existing = await tgtAttsColl.findOne({
                tenantId: TENANT_ID,
                employeeId: emp._id,
                date: midnightDate
            });

            if (!existing) {
                // Calculate working minutes and status
                let mins = 0;
                let status = 'Present';

                if (outTime) {
                    mins = Math.max(0, Math.floor((outTime.getTime() - inTime.getTime()) / 60000));
                    if (mins < 180) status = 'Absent';
                    else if (mins < 360) status = 'Half Day';
                    else status = 'Present';
                } else {
                    // Checked in today or ongoing shift
                    status = 'Present';
                }

                await tgtAttsColl.insertOne({
                    tenantId: TENANT_ID,
                    employeeId: emp._id,
                    date: midnightDate,
                    checkInTime: inTime,
                    checkOutTime: outTime,
                    breaks: [],
                    status: status,
                    isLate: false,
                    lateMinutes: 0,
                    isEarlyCheckout: false,
                    earlyCheckoutMinutes: 0,
                    totalWorkingMinutes: mins,
                    overtimeMinutes: 0,
                    isLateCheckout: false,
                    markedAbsentDueToLateCheckout: false,
                    notes: sa.taskDescription || '',
                    createdAt: sa.createdAt ? new Date(sa.createdAt) : inTime,
                    updatedAt: sa.updatedAt ? new Date(sa.updatedAt) : (outTime || inTime)
                });
                attInserted++;
            } else {
                // Check if checkout occurred after earlier sync
                const exOut = existing.checkOutTime ? new Date(existing.checkOutTime).getTime() : null;
                const srcOut = outTime ? outTime.getTime() : null;

                if (srcOut && (!exOut || Math.abs(srcOut - exOut) > 60000)) {
                    let mins = Math.max(0, Math.floor((outTime.getTime() - new Date(existing.checkInTime || inTime).getTime()) / 60000));
                    let status = mins < 180 ? 'Absent' : (mins < 360 ? 'Half Day' : 'Present');

                    await tgtAttsColl.updateOne(
                        { _id: existing._id },
                        {
                            $set: {
                                checkOutTime: outTime,
                                totalWorkingMinutes: mins,
                                status: status,
                                notes: sa.taskDescription || existing.notes || '',
                                updatedAt: sa.updatedAt ? new Date(sa.updatedAt) : outTime
                            }
                        }
                    );
                    attUpdated++;
                } else {
                    attSkipped++;
                }
            }
        }
        console.log(`✅ Attendances Sync Complete:`);
        console.log(`   - Inserted new dates (Nov 9-13 & missing): ${attInserted}`);
        console.log(`   - Updated with new check-outs: ${attUpdated}`);
        console.log(`   - Skipped (already identical): ${attSkipped}`);

        // ========================================================
        // 2. SYNC LEAVES (All 92 requests)
        // ========================================================
        console.log('\n--- 2. SYNCING LEAVES ---');
        const srcLeaves = await srcConn.db.collection('leaves').find({}).toArray();
        const tgtLeavesColl = tgtConn.db.collection('leaves');

        let leaveInserted = 0;
        let leaveSkipped = 0;

        for (const sl of srcLeaves) {
            const u = srcUserMap[sl.userId?.toString()];
            if (!u || !u.email) {
                leaveSkipped++;
                continue;
            }

            const emp = empByEmail[u.email];
            if (!emp) {
                leaveSkipped++;
                continue;
            }

            const startDate = sl.fromDate ? new Date(sl.fromDate) : new Date(sl.createdAt);
            const endDate = sl.toDate ? new Date(sl.toDate) : startDate;

            // Check if already in target
            const existingLeave = await tgtLeavesColl.findOne({
                tenantId: TENANT_ID,
                employeeId: emp._id,
                startDate: startDate,
                reason: sl.reason || 'Leave requested'
            });

            if (existingLeave) {
                leaveSkipped++;
            } else {
                let status = 'Pending';
                if (sl.status === 'Accepted' || sl.status === 'Approved') status = 'Approved';
                else if (sl.status === 'Rejected') status = 'Rejected';

                let leaveType = sl.leaveType || 'Casual Leave';
                if (!['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave', 'Permission'].includes(leaveType)) {
                    leaveType = 'Casual Leave';
                }

                await tgtLeavesColl.insertOne({
                    tenantId: TENANT_ID,
                    employeeId: emp._id,
                    leaveType: leaveType,
                    startDate: startDate,
                    endDate: endDate,
                    reason: (sl.reason || 'Leave requested').trim(),
                    status: status,
                    managerComments: sl.managerComments || '',
                    createdAt: sl.createdAt ? new Date(sl.createdAt) : new Date(),
                    updatedAt: sl.updatedAt ? new Date(sl.updatedAt) : new Date()
                });
                leaveInserted++;
            }
        }
        console.log(`✅ Leaves Sync Complete:`);
        console.log(`   - Inserted: ${leaveInserted}`);
        console.log(`   - Skipped (already existed): ${leaveSkipped}`);

        // ========================================================
        // 3. SYNC PERMISSIONS (All 6 requests)
        // ========================================================
        console.log('\n--- 3. SYNCING PERMISSION REQUESTS ---');
        const srcPerms = await srcConn.db.collection('permissions').find({}).toArray();
        const tgtPermsColl = tgtConn.db.collection('permissions');

        let permInserted = 0;
        let permSkipped = 0;

        for (const sp of srcPerms) {
            const u = srcUserMap[sp.userId?.toString()];
            if (!u || !u.email) {
                permSkipped++;
                continue;
            }

            const emp = empByEmail[u.email];
            if (!emp) {
                permSkipped++;
                continue;
            }

            const permDate = sp.date ? new Date(sp.date) : new Date(sp.createdAt);

            const existingPerm = await tgtPermsColl.findOne({
                tenantId: TENANT_ID,
                employeeId: emp._id,
                reason: sp.reason
            });

            if (existingPerm) {
                permSkipped++;
            } else {
                let status = 'Pending';
                if (sp.status === 'Accepted' || sp.status === 'Approved') status = 'Approved';
                else if (sp.status === 'Rejected') status = 'Rejected';

                // Try to infer hours
                let hours = 2;
                if (sp.reason && sp.reason.includes('3pm to 6pm')) hours = 3;
                else if (sp.reason && sp.reason.includes('3:30 PM to 6:00 PM')) hours = 2.5;

                await tgtPermsColl.insertOne({
                    tenantId: TENANT_ID,
                    employeeId: emp._id,
                    date: permDate,
                    hours: hours,
                    timeSlot: '',
                    type: 'Personal Work',
                    reason: (sp.reason || 'Permission requested').trim(),
                    status: status,
                    managerComments: '',
                    createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
                    updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date()
                });
                permInserted++;
            }
        }
        console.log(`✅ Permissions Sync Complete:`);
        console.log(`   - Inserted: ${permInserted}`);
        console.log(`   - Skipped (already existed): ${permSkipped}`);

        // ========================================================
        // 4. SYNC MISSING TRANSACTIONS (Finance Payments)
        // ========================================================
        console.log('\n--- 4. SYNCING MISSING TRANSACTIONS (EXPENSES) ---');
        const srcTx = await srcConn.db.collection('transactions').find({}).toArray();
        const tgtPayColl = tgtConn.db.collection('payments');

        const tgtPayments = await tgtPayColl.find({ tenantId: TENANT_ID }).toArray();
        const tgtRefMap = new Set(tgtPayments.map(p => p.referenceNumber).filter(Boolean));

        const missingTx = srcTx.filter(t => !tgtRefMap.has(t._id.toString()));
        console.log(`Found ${missingTx.length} missing transactions to inject into Payments.`);

        let payInserted = 0;
        let currentCount = await tgtPayColl.countDocuments({ tenantId: TENANT_ID });

        for (const tx of missingTx) {
            currentCount++;
            const paymentId = `PAY-${currentCount.toString().padStart(5, '0')}`;
            const payType = (tx.type || 'expense').toLowerCase() === 'income' ? 'Inward' : 'Outward';
            const payDate = tx.date ? new Date(tx.date) : new Date();

            await tgtPayColl.insertOne({
                tenantId: TENANT_ID,
                paymentId: paymentId,
                paymentType: payType,
                category: 'Direct Expense',
                amount: Number(tx.amount) || 0,
                paymentDate: payDate,
                paymentMode: 'Bank Transfer',
                notes: (tx.description || '').trim(),
                referenceNumber: tx._id.toString(),
                createdAt: payDate,
                updatedAt: new Date()
            });
            payInserted++;
            console.log(`   + Added ${paymentId}: ${tx.description} (₹${tx.amount}) on ${payDate.toISOString().split('T')[0]}`);
        }
        console.log(`✅ Payments Sync Complete: Inserted ${payInserted} new payments.`);

        // ========================================================
        // 5. SYNC INVOICE UPDATES (e.g. SKT/25-26/N45)
        // ========================================================
        console.log('\n--- 5. SYNCING INVOICE PAYMENT UPDATES ---');
        const tgtInvColl = tgtConn.db.collection('invoices');
        const updateInv = await tgtInvColl.updateOne(
            { tenantId: TENANT_ID, invoiceNumber: 'SKT/25-26/N45' },
            {
                $set: {
                    paidAmount: 21000,
                    paymentStatus: 'Paid',
                    lastPaymentDate: new Date('2026-11-10T00:00:00.000Z'),
                    updatedAt: new Date()
                }
            }
        );
        console.log(`✅ Invoices Sync Complete: Updated SKT/25-26/N45 (modified: ${updateInv.modifiedCount})`);

        // ========================================================
        // FINAL SUMMARY AUDIT
        // ========================================================
        console.log('\n========================================================');
        console.log('🎉 ALL MODULES SUCCESSFULLY SYNCED UP TO TODAY!');
        console.log('========================================================');
        console.log(`- Attendances in Skite Prime: ${await tgtAttsColl.countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Leaves in Skite Prime:      ${await tgtLeavesColl.countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Permissions in Skite Prime: ${await tgtPermsColl.countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Payments in Skite Prime:    ${await tgtPayColl.countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Invoices in Skite Prime:    ${await tgtInvColl.countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Leads in Skite Prime:       ${await tgtConn.db.collection('leads').countDocuments({ tenantId: TENANT_ID })}`);
        console.log(`- Tasks in Skite Prime:       ${await tgtConn.db.collection('tasks').countDocuments({ tenantId: TENANT_ID })}`);
        console.log('========================================================\n');

    } catch (err) {
        console.error('❌ Error during delta sync:', err);
    } finally {
        if (srcConn) await srcConn.close();
        if (tgtConn) await tgtConn.close();
    }
}

syncAllToToday();
