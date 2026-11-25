function payrollDay(value) {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
    if (typeof value !== 'string') return '';
    const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    const day = legacy ? `${legacy[3]}-${legacy[2].padStart(2, '0')}-${legacy[1].padStart(2, '0')}` : value.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
    const date = new Date(day);
    return Number.isFinite(date.getTime()) && date.toISOString().startsWith(day) ? day : '';
}

function legacyPayroll(roster, logs, from, to) {
    const days = new Map();
    for (const log of logs) {
        const date = payrollDay(log.date);
        if (log.status !== 'Present' || !date || date < from || date > to) continue;
        const id = String(log.userId || log.employeeId);
        if (!days.has(id)) days.set(id, []);
        days.get(id).push(date);
    }
    return roster.map(person => {
        const dates = (days.get(String(person._id)) || []).sort();
        const rate = Number(person.salary || person.perDaySalary) || 0;
        return {
            _id: person._id, name: person.fullName || [person.firstName, person.lastName].filter(Boolean).join(' '),
            employeeCode: person.empId || person.employeeId || '', rate, dates,
            presentDays: dates.length, calculatedPay: Math.round(dates.length * rate)
        };
    });
}

module.exports = { payrollDay, legacyPayroll };
