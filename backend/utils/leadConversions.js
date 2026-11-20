const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});

function conversionChange(previous, next, now = new Date()) {
    if (next === undefined || previous === next) return {};
    return { convertedAt: next === 'Converted' ? now : null };
}

function countMonthlyWins(leads, now = new Date()) {
    const month = dayFormat.format(now).slice(0, 7);
    return leads.reduce((total, lead) => {
        if (lead.leadStatus !== 'Converted' || !lead.convertedAt) return total;
        const date = new Date(lead.convertedAt);
        return total + Number(Number.isFinite(date.getTime()) && date <= now && dayFormat.format(date).startsWith(month));
    }, 0);
}

module.exports = { conversionChange, countMonthlyWins };
