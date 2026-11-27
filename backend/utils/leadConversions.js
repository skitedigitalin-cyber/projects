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

function countPeriodWins(leads, now = new Date()) {
    const today = dayFormat.format(now);
    const midnight = Date.parse(today);
    const dayAt = offset => new Date(midnight + offset * 86400000).toISOString().slice(0, 10);
    const weekStart = dayAt(-6);
    const month = today.slice(0, 7);

    let todayWins = 0;
    let weekWins = 0;
    let monthWins = 0;

    for (const lead of leads) {
        if (lead.leadStatus !== 'Converted') continue;
        const date = lead.convertedAt ? new Date(lead.convertedAt) : (lead.updatedAt ? new Date(lead.updatedAt) : null);
        if (!date || !Number.isFinite(date.getTime()) || date > now) continue;
        const d = dayFormat.format(date);
        if (d === today) todayWins++;
        if (d >= weekStart && d <= today) weekWins++;
        if (d.startsWith(month) && d <= today) monthWins++;
    }
    return { today: todayWins, week: weekWins, month: monthWins };
}

module.exports = { conversionChange, countMonthlyWins, countPeriodWins };
