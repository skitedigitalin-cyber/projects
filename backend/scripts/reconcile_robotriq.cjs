const fs = require('node:fs');
const dotenv = require('dotenv');
const { mongo: { MongoClient, ObjectId } } = require('mongoose');

const robotriqId = '6afd35731172da4b0de9a48e';
const scope = { tenantId: { $in: [new ObjectId(robotriqId), robotriqId] } };
const normalize = value => String(value ?? '').trim().toLowerCase();
const phone = value => String(value ?? '').replace(/\D/g, '');
const key = (...parts) => parts.every(Boolean) ? JSON.stringify(parts) : '';

function uriFrom(file) {
    const config = dotenv.parse(fs.readFileSync(file));
    const uri = config.MONGO_URI || config.MONGODB_URI;
    if (!uri) throw new Error('Missing database URI');
    return uri;
}

function compare(source, target, identities, fields = {}) {
    const lookups = identities.map(([getSource, getTarget]) => {
        const index = new Map();
        for (const record of target) {
            const value = getTarget(record);
            if (value) index.set(value, [...(index.get(value) || []), record]);
        }
        return { getSource, index };
    });
    const result = { source: source.length, target: target.length, matched: 0, unmatched: 0,
        ambiguous: 0, duplicateSourceMatches: 0, targetOnly: 0, fieldDifferences: {} };
    const matched = new Set();
    for (const record of source) {
        const candidates = new Set(lookups.flatMap(({ getSource, index }) => index.get(getSource(record)) || []));
        if (candidates.size === 0) {
            result.unmatched++;
            continue;
        }
        if (candidates.size > 1) {
            result.ambiguous++;
            continue;
        }
        const [candidate] = candidates;
        result.matched++;
        if (matched.has(candidate)) result.duplicateSourceMatches++;
        matched.add(candidate);
        for (const [name, [getSource, getTarget]] of Object.entries(fields)) {
            if (getSource(record) !== getTarget(candidate)) {
                result.fieldDifferences[name] = (result.fieldDifferences[name] || 0) + 1;
            }
        }
    }
    result.targetOnly = target.length - matched.size;
    return result;
}

function day(value) {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value || '');
    if (parts) return [parts[3], parts[2].padStart(2, '0'), parts[1].padStart(2, '0')].join('-');
    return /^\d{4}-\d{2}-\d{2}/.exec(value || '')?.[0] || '';
}

const attendanceStatus = value => normalize(value).replace(/\s/g, '');

async function main() {
    const [legacyEnv, currentEnv] = process.argv.slice(2);
    const options = { serverSelectionTimeoutMS: 8000 };
    const legacy = new MongoClient(uriFrom(legacyEnv), options);
    const current = new MongoClient(uriFrom(currentEnv), options);
    try {
        await Promise.all([legacy.connect(), current.connect()]);
        const source = legacy.db();
        const target = current.db();
        if (source.databaseName !== 'Robotriq' || target.databaseName !== 'skitecrm' ||
            !await target.collection('tenants').findOne({ _id: new ObjectId(robotriqId) }, { projection: { _id: 1 } })) {
            throw new Error('Unexpected databases or missing Robotriq tenant');
        }
        const read = (db, name, filter = {}) => db.collection(name).find(filter, {
            projection: { password: 0, photo: 0, profileImage: 0 }, maxTimeMS: 10000
        }).toArray();
        const [legacyUsers, legacyAttendance, legacyLeads, legacyAdminQuotes, legacySalesQuotes,
            students, employees, staff, employeeAttendance, studentAttendance, leads, quotes] = await Promise.all([
            ...['users', 'attendances', 'leads', 'adminquotations', 'quotations'].map(name => read(source, name)),
            ...['students', 'employees', 'users', 'attendances', 'studentattendances', 'leads', 'quotes']
                .map(name => read(target, name, scope))
        ]);
        const studentUsers = legacyUsers.filter(row => normalize(row.role) === 'student');
        const staffUsers = legacyUsers.filter(row => normalize(row.role) !== 'student');
        const legacyPerson = new Map(legacyUsers.map(row => [String(row._id), row]));
        const currentEmployee = new Map(employees.map(row => [String(row._id), row]));
        const currentStudent = new Map(students.map(row => [String(row._id), row]));
        const accountMatch = [[row => normalize(row.email), row => normalize(row.email)]];
        const staffEmails = staffUsers.map(row => normalize(row.email)).filter(Boolean);
        const crossTenantEmailCollisions = await target.collection('users').countDocuments({
            email: { $in: staffEmails }, tenantId: { $nin: scope.tenantId.$in }
        }, { collation: { locale: 'en', strength: 2 }, maxTimeMS: 10000 });

        const report = {
            students: compare(studentUsers, students, [
                [row => normalize(row.studentId), row => normalize(row.studentId)], ...accountMatch
            ], {
                fees: [row => Number(row.fees || 0), row => Number(row.fees || 0)],
                paidAmount: [row => Number(row.paidAmount || 0), row => Number(row.paidAmount || 0)]
            }),
            staffAccounts: compare(staffUsers, staff, accountMatch, {
                role: [row => normalize(row.role), row => normalize(row.role)]
            }),
            employeeProfiles: compare(staffUsers, employees, [
                [row => normalize(row.empId), row => normalize(row.employeeId)], ...accountMatch
            ]),
            employeeAttendance: compare(legacyAttendance.filter(row => row.role !== 'student'), employeeAttendance, [
                [row => key(normalize(legacyPerson.get(String(row.userId))?.empId), day(row.date)),
                    row => key(normalize(currentEmployee.get(String(row.employeeId))?.employeeId), day(row.date))],
                [row => key(normalize(legacyPerson.get(String(row.userId))?.email), day(row.date)),
                    row => key(normalize(currentEmployee.get(String(row.employeeId))?.email), day(row.date))]
            ], { status: [row => attendanceStatus(row.status), row => attendanceStatus(row.status)] }),
            studentAttendance: compare(legacyAttendance.filter(row => row.role === 'student'), studentAttendance, [
                [row => key(normalize(legacyPerson.get(String(row.userId))?.studentId), day(row.date), normalize(row.checkIn)),
                    row => key(normalize(row.studentCode || currentStudent.get(String(row.studentId))?.studentId),
                        day(row.dateObj || row.date), normalize(row.checkIn))]
            ], { status: [row => attendanceStatus(row.status), row => attendanceStatus(row.status)] }),
            trainingLeads: compare(legacyLeads, leads, [
                [row => String(row._id), row => String(row.sourceDbOriginalId || row._id)],
                [row => key(phone(row.mobile), normalize(row.name)),
                    row => key(phone(row.mobileNumber), normalize(row.customerName))]
            ]),
            adminQuotes: compare(legacyAdminQuotes, quotes, [
                [row => normalize(row.quotationNo), row => normalize(row.quoteNo)]
            ], { total: [row => Number(row.netAmount), row => Number(row.grandTotal)] }),
            salesQuotes: compare(legacySalesQuotes, quotes, [
                [row => normalize(row.quotationNo), row => normalize(row.quoteNo)]
            ]),
            crossTenantEmailCollisions
        };
        console.log(JSON.stringify(report, null, 2));
    } finally {
        await Promise.allSettled([legacy.close(), current.close()]);
    }
}

main().catch(error => {
    console.error('Reconciliation failed:', error.name, error.code || '');
    process.exitCode = 1;
});
