const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const dotenv = require('dotenv');
const { mongo: { MongoClient, ObjectId, BSON } } = require('mongoose');
const Customer = require('../models/RobotriqCustomer');
const Schedule = require('../models/RobotriqSchedule');
const Item = require('../models/RobotriqItem');
const Bom = require('../models/RobotriqBom');
const SalesQuote = require('../models/RobotriqSalesQuote');
const { SalesLead, DirectEnquiry } = require('../models/RobotriqEnquiry');
const { Account, Expense } = require('../models/RobotriqLedger');
const { parseLegacyReceipt } = require('../utils/robotriqFeeReceipt');
const { LegacyRoster, LegacyAttendance } = require('../models/RobotriqPayrollHistory');
const { Leave, Notification } = require('../models/RobotriqLeave');
const Booking = require('../models/RobotriqBooking');
const LegacyTask = require('../models/RobotriqLegacyTask');
const { TrainingLead, Reminder } = require('../models/RobotriqTrainingHistory');
const { AdminQuote, ServiceReport } = require('../models/RobotriqDocumentHistory');
const StaffAccess = require('../models/RobotriqStaffAccess');
const CheckoutRequest = require('../models/RobotriqCheckoutRequest');

const tenantId = new ObjectId('6afd35731172da4b0de9a48e');
const modules = [
    { collection: 'customers', model: Customer },
    { collection: 'items', model: Item },
    { collection: 'salesleads', model: SalesLead, naturalKey: 'enquiryId', staffField: 'assignedEmployee',
        legacyStaffField: 'legacyAssignedEmployee', references: {
        customers: row => row.customer ? [row.customer] : []
    } },
    { collection: 'robotriqleads', model: DirectEnquiry, naturalKey: 'enquiryId', staffField: 'assignedEmployee',
        legacyStaffField: 'legacyAssignedEmployee', references: {
        customers: row => row.customer ? [row.customer] : []
    } },
    { collection: 'boms', model: Bom, references: {
        salesleads: row => [row.lead], items: row => (row.items || []).map(item => item.item)
    } },
    { collection: 'quotations', model: SalesQuote, naturalKey: 'quotationNo', references: {
        salesleads: row => [row.lead], items: row => (row.items || []).map(item => item.item)
    } },
    { collection: 'schedules', model: Schedule, naturalKey: 'group' },
    { collection: 'accounts', model: Account, matchReceipts: true },
    { collection: 'expenses', model: Expense, staffField: 'employeeId', legacyStaffField: 'legacyEmployeeId' },
    { collection: 'users', model: LegacyRoster, sourceFilter: { role: { $in: ['employee', 'manager'] } },
        projection: { fullName: 1, empId: 1, role: 1, salary: 1, perDaySalary: 1, createdAt: 1, updatedAt: 1 } },
    { collection: 'attendances', model: LegacyAttendance, mapAttendance: true },
    { collection: 'leaves', model: Leave, mapOwner: true },
    { collection: 'notifications', model: Notification, mapOwner: true },
    { collection: 'forgotcheckouts', model: CheckoutRequest, mapOwner: true, legacyCheckout: true },
    { collection: 'bookings', model: Booking, mapBooking: true },
    { collection: 'tasks', model: LegacyTask, mapTask: true },
    { collection: 'leads', model: TrainingLead, linkCurrentLead: true },
    { collection: 'reminders', model: Reminder, legacyReminder: true, references: { leads: row => [row.leadId] } },
    { collection: 'adminquotations', model: AdminQuote, naturalKey: 'quotationNo', linkCurrentQuote: true, references: {
        robotriqleads: row => row.robotriqLead ? [row.robotriqLead] : [],
        customers: row => row.customer ? [row.customer] : [],
        items: row => (row.items || []).map(item => item.item).filter(Boolean)
    }, historicalReferences: { leads: row => row.lead ? [row.lead] : [] } },
    { collection: 'servicereports', model: ServiceReport, historicalReferences: {
        customers: row => row.customerId ? [row.customerId] : []
    }, linkReportAssignee: true },
    { collection: 'users', model: StaffAccess, mapStaffAccess: true, sourceFilter: { role: { $ne: 'student' } },
        projection: { role: 1, dashboardPermissions: 1 } }
];

function uriFrom(file) {
    const env = dotenv.parse(fs.readFileSync(file));
    const uri = env.MONGO_URI || env.MONGODB_URI;
    if (!uri) throw new Error('Missing database configuration.');
    return uri;
}

function sameValue(actual, expected) {
    if (expected instanceof ObjectId) return actual instanceof ObjectId && expected.equals(actual);
    if (Array.isArray(expected)) {
        return Array.isArray(actual) && actual.length === expected.length &&
            expected.every((value, index) => sameValue(actual[index], value));
    }
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
        return !!actual && Object.keys(expected).every(field => sameValue(actual[field], expected[field]));
    }
    return isDeepStrictEqual(actual, expected);
}

function planFingerprint(source, destination, plans) {
    const fingerprint = createHash('sha256');
    const identity = client => [client.db().databaseName, client.options.srvHost || client.options.hosts.map(String).sort()];
    const append = value => fingerprint.update(JSON.stringify(value, (key, item) =>
        item && !Array.isArray(item) && Object.getPrototypeOf(item) === Object.prototype
            ? Object.fromEntries(Object.keys(item).sort().map(field => [field, item[field]])) : item)).update('\n');
    append(['robotriq-import-v1', String(tenantId), identity(source), identity(destination)]);
    for (const plan of plans) {
        append(plan.summary);
        for (const records of [plan.pending, plan.unchanged]) {
            append(records.length);
            for (const record of [...records].sort((a, b) => String(a._id).localeCompare(String(b._id)))) {
                append(BSON.EJSON.serialize(record, { relaxed: false }));
            }
        }
    }
    return fingerprint.digest('hex');
}

async function staffMatches(source, target) {
    const scope = { tenantId: { $in: [tenantId, String(tenantId)] } };
    const [legacy, current, employeeProfiles] = await Promise.all([
        source.collection('users').find({ role: { $ne: 'student' } }, { projection: { email: 1, empId: 1, role: 1 } }).toArray(),
        target.collection('users').find({ ...scope, isActive: true }, { projection: { email: 1, role: 1 } }).toArray(),
        target.collection('employees').find(scope, { projection: { employeeId: 1, userId: 1 } }).toArray()
    ]);
    const normalize = value => String(value || '').trim().toLowerCase();
    const activeStaff = new Map(current.map(row => [String(row._id), row._id]));
    const matches = new Map();
    for (const old of legacy) {
        const email = normalize(old.email);
        const code = normalize(old.empId);
        const emailMatches = email ? current.filter(row => normalize(row.email) === email) : [];
        const profiles = code ? employeeProfiles.filter(row => normalize(row.employeeId) === code) : [];
        if (emailMatches.length > 1 || (email && legacy.filter(row => normalize(row.email) === email).length > 1)) continue;

        const byEmail = emailMatches[0]?._id;
        const duplicateCode = profiles.length > 1 || (code && legacy.filter(row => normalize(row.empId) === code).length > 1);
        if (duplicateCode) {
            // A recycled code can still corroborate an exact email when one profile links directly to that account.
            if (byEmail && normalize(emailMatches[0].role) === normalize(old.role) &&
                profiles.filter(profile => String(profile.userId) === String(byEmail)).length === 1) {
                matches.set(String(old._id), byEmail);
            }
            continue;
        }
        const byCode = activeStaff.get(String(profiles[0]?.userId));
        if (byEmail && byCode && !byEmail.equals(byCode)) continue;
        if (byEmail || byCode) matches.set(String(old._id), byEmail || byCode);
    }
    const counts = new Map();
    for (const id of matches.values()) counts.set(String(id), (counts.get(String(id)) || 0) + 1);
    return new Map([...matches].filter(([, id]) => counts.get(String(id)) === 1));
}

async function main() {
    const [sourceEnv, destinationEnv, mode, expectedPlan, ...extra] = process.argv.slice(2);
    const productionCopy = mode === '--apply-robotriq-copy';
    if (!sourceEnv || !destinationEnv || extra.length || (mode && !productionCopy && mode !== '--apply-rehearsal') ||
        ((productionCopy || expectedPlan !== undefined) && !/^[a-f0-9]{64}$/.test(expectedPlan))) {
        throw new Error('Pass the two env files. Writes use --apply-rehearsal or --apply-robotriq-copy; the latter requires a preview plan ID.');
    }
    const sourceUri = uriFrom(sourceEnv);
    const destinationUri = uriFrom(destinationEnv);
    const rehearsalName = /^skitecrm_robotriq_rehearsal(?:_[a-z0-9]+)?$/;
    if (mode === '--apply-rehearsal' && !/^mongodb:\/\/127\.0\.0\.1:\d+\/skitecrm_robotriq_rehearsal(?:_[a-z0-9]+)?(?:\?[^#]*)?$/.test(destinationUri)) {
        throw new Error('Rehearsal writes require a dedicated database on 127.0.0.1.');
    }
    if (productionCopy && !destinationUri.startsWith('mongodb+srv://')) {
        throw new Error('The production copy requires the SkiteCRM Atlas connection.');
    }
    const options = { serverSelectionTimeoutMS: 8000 };
    const legacy = new MongoClient(sourceUri, options);
    const destination = new MongoClient(destinationUri, options);
    try {
        await Promise.all([legacy.connect(), destination.connect()]);
        const source = legacy.db();
        const target = destination.db();
        if (source.databaseName !== 'Robotriq' ||
            (target.databaseName !== 'skitecrm' && !rehearsalName.test(target.databaseName))) {
            throw new Error('Unexpected database names.');
        }
        if (mode === '--apply-rehearsal' && !rehearsalName.test(target.databaseName)) {
            throw new Error('Writes require a dedicated Robotriq rehearsal database.');
        }
        if (productionCopy && target.databaseName !== 'skitecrm') throw new Error('Unexpected SkiteCRM production database.');
        if (!await target.collection('tenants').findOne({ _id: tenantId }, { projection: { _id: 1 } })) {
            throw new Error('Destination does not contain the Robotriq tenant.');
        }

        const plans = [];
        const eligibleIds = new Map();
        const scope = { tenantId: { $in: [tenantId, String(tenantId)] } };
        const [assignees, students, legacyStudents, currentLeads, currentQuotes, currentStaff] = await Promise.all([
            staffMatches(source, target),
            target.collection('students').find({ tenantId: { $in: [tenantId, String(tenantId)] } }, {
                projection: { studentId: 1, orderId: 1, email: 1, paidAmount: 1 }
            }).toArray(),
            source.collection('users').find({ role: 'student' }, { projection: { studentId: 1, email: 1 } }).toArray(),
            target.collection('leads').find({ tenantId: { $in: [tenantId, String(tenantId)] } }, {
                projection: { sourceDbOriginalId: 1, customerName: 1, mobileNumber: 1 }
            }).toArray(),
            target.collection('quotes').find(scope, { projection: { quoteNo: 1, grandTotal: 1 } }).toArray(),
            target.collection('users').find({ ...scope, isActive: true }, { projection: { role: 1 } }).toArray()
        ]);
        const normalizeOrder = orderId => String(orderId || '').trim().toLowerCase();
        const currentRoles = new Map(currentStaff.map(user => [String(user._id), normalizeOrder(user.role)]));
        const studentOwners = new Map();
        for (const old of legacyStudents) {
            const matches = students.filter(student => ['studentId', 'email'].some(field =>
                normalizeOrder(old[field]) && normalizeOrder(old[field]) === normalizeOrder(student[field])));
            if (matches.length === 1) studentOwners.set(String(old._id), matches[0]._id);
        }
        for (const { collection, model, naturalKey, references, staffField, legacyStaffField, matchReceipts,
            mapOwner, mapBooking, mapAttendance, mapTask, linkCurrentLead, legacyReminder,
            linkCurrentQuote, linkReportAssignee, historicalReferences, mapStaffAccess, legacyCheckout,
            sourceFilter = {}, projection } of modules) {
            const rows = await source.collection(collection).find(sourceFilter, { projection, maxTimeMS: 10000 }).toArray();
            const destinationCollection = target.collection(model.collection.name);
            const existing = await destinationCollection.find({
                $or: [{ tenantId }, { _id: { $in: rows.map(row => row._id) } }]
            }, { maxTimeMS: 10000 }).toArray();
            const byId = new Map(existing.map(row => [String(row._id), row]));
            const byKey = new Set(existing.map(row => row[naturalKey]));
            const summary = { collection, destination: destinationCollection.collectionName,
                source: rows.length, unchanged: 0, inserts: 0, conflicts: 0, invalid: 0, unresolvedLinks: 0 };
            const pending = [];
            const unchanged = [];
            const eligible = new Set();
            const receiptTotals = new Map();
            eligibleIds.set(collection, eligible);
            for (const row of rows) {
                let record = { ...row, tenantId };
                if (mapStaffAccess) {
                    const currentUserId = assignees.get(String(row._id));
                    if (!currentUserId) {
                        summary.unmatchedStaff = (summary.unmatchedStaff || 0) + 1;
                        continue;
                    }
                    const enabled = currentRoles.get(String(currentUserId)) === normalizeOrder(row.role);
                    const field = enabled ? 'matchedStaff' : 'roleDifferences';
                    summary[field] = (summary[field] || 0) + 1;
                    const permissions = Object.fromEntries(Object.entries(row.dashboardPermissions || {})
                        .filter(([name, value]) => /^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(name) && typeof value === 'boolean'));
                    record = { _id: row._id, tenantId, legacyUserId: row._id, currentUserId, legacyRole: row.role, enabled, permissions };
                }
                if (legacyReminder) record.leadSource = 'legacy';
                if (linkCurrentQuote) {
                    const quoteNo = normalizeOrder(row.quotationNo);
                    const matches = currentQuotes.filter(quote => quoteNo && normalizeOrder(quote.quoteNo) === quoteNo &&
                        Math.round(Number(quote.grandTotal) * 100) === Math.round(Number(row.netAmount) * 100));
                    if (matches.length === 1) record.currentQuoteId = matches[0]._id;
                    const field = matches.length === 1 ? 'mappedCurrentQuotes' : 'unmappedCurrentQuotes';
                    summary[field] = (summary[field] || 0) + 1;
                }
                if (linkReportAssignee && row.assignedTo) {
                    const assignee = assignees.get(String(row.assignedTo));
                    if (assignee) record.currentAssigneeId = assignee;
                    const field = assignee ? 'mappedAssignees' : 'unmappedAssignees';
                    summary[field] = (summary[field] || 0) + 1;
                }
                if (linkCurrentLead) {
                    const name = normalizeOrder(row.name);
                    const mobile = String(row.mobile || '').replace(/\D/g, '');
                    const matches = currentLeads.filter(lead => String(lead.sourceDbOriginalId || lead._id) === String(row._id) ||
                        (name && mobile && normalizeOrder(lead.customerName) === name &&
                            String(lead.mobileNumber || '').replace(/\D/g, '') === mobile));
                    if (matches.length === 1) record.currentLeadId = matches[0]._id;
                    const field = matches.length === 1 ? 'mappedCurrentLeads' : 'unmappedCurrentLeads';
                    summary[field] = (summary[field] || 0) + 1;
                }
                if (mapAttendance && row.role === 'student') {
                    const student = studentOwners.get(String(row.userId));
                    const field = student ? 'mappedStudents' : 'unmappedStudents';
                    summary[field] = (summary[field] || 0) + 1;
                    if (student) record.currentStudentId = student;
                }
                if (mapTask) {
                    const student = studentOwners.get(String(row.assignedTo));
                    const staff = assignees.get(String(row.assignedTo));
                    record.ownerType = student ? 'student' : staff ? 'staff' : 'unresolved';
                    if (student || staff) record.currentOwnerId = student || staff;
                    const field = student || staff ? 'mappedOwners' : 'unmappedOwners';
                    summary[field] = (summary[field] || 0) + 1;
                }
                if (mapBooking) {
                    const student = studentOwners.get(String(row.studentId));
                    const teacher = assignees.get(String(row.teacherId));
                    record.legacyStudentId = row.studentId;
                    record.legacyTeacherId = row.teacherId;
                    record.studentId = student || row.studentId;
                    record.teacherId = teacher || row.teacherId;
                    record.unresolvedStudent = !student;
                    record.unresolvedTeacher = !teacher;
                    if (!student) summary.unmappedStudents = (summary.unmappedStudents || 0) + 1;
                    if (!teacher) summary.unmappedTeachers = (summary.unmappedTeachers || 0) + 1;
                }
                if (mapOwner) {
                    const legacyId = String(row.userId);
                    const student = legacyCheckout ? null : studentOwners.get(legacyId);
                    const staff = assignees.get(legacyId);
                    record.legacyUserId = row.userId;
                    record.userId = student || staff || row.userId;
                    record.ownerType = student ? 'student' : staff ? 'staff' : 'unresolved';
                    if (legacyCheckout) record.status = 'Pending';
                    const field = student || staff ? 'mappedOwners' : 'unmappedOwners';
                    summary[field] = (summary[field] || 0) + 1;
                }
                const receipt = matchReceipts ? parseLegacyReceipt(row) : null;
                if (receipt) {
                    const order = normalizeOrder(receipt.orderId);
                    const candidates = order ? students.filter(student => normalizeOrder(student.orderId) === order) : [];
                    if (candidates.length === 1) {
                        record.historicalStudentId = candidates[0]._id;
                        const id = String(record.historicalStudentId);
                        receiptTotals.set(id, (receiptTotals.get(id) || 0) + Math.round(row.amount * 100));
                        summary.matchedStudentReceipts = (summary.matchedStudentReceipts || 0) + 1;
                    } else {
                        summary.unmatchedStudentReceipts = (summary.unmatchedStudentReceipts || 0) + 1;
                    }
                }
                if (staffField && record[staffField]) {
                    record[legacyStaffField] = record[staffField];
                    const assigned = assignees.get(String(record[staffField]));
                    const field = assigned ? 'mappedAssignees' : 'unmappedAssignees';
                    summary[field] = (summary[field] || 0) + 1;
                    if (assigned) record[staffField] = assigned;
                }
                if (!(record._id instanceof ObjectId)) {
                    summary.invalid++;
                    continue;
                }
                try {
                    await new model(record).validate();
                } catch (error) {
                    if (error.name !== 'ValidationError') throw error;
                    summary.invalid++;
                    continue;
                }
                const invalidLink = Object.entries(references || {}).some(([name, getIds]) =>
                    getIds(record).some(id => !eligibleIds.get(name)?.has(String(id))));
                if (invalidLink) {
                    summary.unresolvedLinks++;
                    continue;
                }
                const missingHistorical = Object.entries(historicalReferences || {}).flatMap(([name, getIds]) =>
                    getIds(record).filter(id => !eligibleIds.get(name)?.has(String(id)))).length;
                if (missingHistorical) summary.missingHistoricalLinks = (summary.missingHistoricalLinks || 0) + missingHistorical;
                const match = byId.get(String(record._id));
                if (match && sameValue(match, record)) {
                    summary.unchanged++;
                    unchanged.push(record);
                    eligible.add(String(record._id));
                } else if (match || (naturalKey && byKey.has(record[naturalKey]))) {
                    summary.conflicts++;
                } else {
                    pending.push(record);
                    eligible.add(String(record._id));
                    summary.inserts++;
                    if (naturalKey) byKey.add(record[naturalKey]);
                }
            }
            if (matchReceipts) {
                summary.studentReceiptTotalDifferences = students.filter(student => {
                    const total = receiptTotals.get(String(student._id));
                    return total !== undefined && total !== Math.round((student.paidAmount || 0) * 100);
                }).length;
            }
            console.log(JSON.stringify(summary));
            plans.push({ destinationCollection, pending, unchanged, summary, naturalKey });
        }
        const planId = planFingerprint(legacy, destination, plans);
        console.log(JSON.stringify({ planId }));
        if (!mode) return;
        if (expectedPlan && expectedPlan !== planId) {
            throw new Error('The import plan changed since the preview. No records were written.');
        }
        if (plans.some(({ summary }) => summary.conflicts || summary.invalid || summary.unresolvedLinks)) {
            throw new Error('Rehearsal aborted due to conflicts, invalid records, or unresolved links.');
        }
        const needed = plans.filter(({ pending }) => pending.length);
        if (needed.some(({ destinationCollection, pending }) => !destinationCollection.collectionName.startsWith('robotriq_') ||
            pending.some(record => !tenantId.equals(record.tenantId)))) {
            throw new Error('The plan contains a write outside the Robotriq collections or tenant.');
        }
        if (!needed.length) return;
        for (const { destinationCollection, naturalKey } of needed) {
            if (naturalKey) {
                await destinationCollection.createIndex({ tenantId: 1, [naturalKey]: 1 }, { unique: true });
            } else {
                try {
                    await target.createCollection(destinationCollection.collectionName);
                } catch (error) {
                    if (error.code !== 48) throw error;
                }
            }
        }
        const counts = await destination.withSession(session => session.withTransaction(async () => {
            const inserted = [];
            for (const { destinationCollection, pending, unchanged } of plans) {
                if (pending.length) {
                    const result = await destinationCollection.bulkWrite(pending.map(record => ({
                        updateOne: { filter: { _id: record._id, tenantId }, update: { $setOnInsert: record }, upsert: true }
                    })), { session });
                    inserted.push({ collection: destinationCollection.collectionName, inserted: result.upsertedCount });
                }
                const expected = [...pending, ...unchanged];
                if (!expected.length) continue;
                const stored = await destinationCollection.find({ tenantId, _id: { $in: expected.map(row => row._id) } }, { session }).toArray();
                const byId = new Map(stored.map(row => [String(row._id), row]));
                if (expected.some(row => !sameValue(byId.get(String(row._id)), row))) {
                    throw new Error('Rehearsal verification found a changed or missing record.');
                }
            }
            return inserted;
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }));
        counts.forEach(summary => console.log(JSON.stringify(summary)));
    } finally {
        await Promise.allSettled([legacy.close(), destination.close()]);
    }
}

main().catch(error => {
    const message = error.name === 'Error' ? error.message : error.name;
    console.error('Rehearsal failed:', message, error.code || '');
    process.exitCode = 1;
});
