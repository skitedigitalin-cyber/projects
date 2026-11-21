export function leadReminder(lead) {
    if (['Lost', 'Converted'].includes(lead.leadStatus)) return null;
    const prefix = lead.leadStatus === 'Appointment' ? 'appointment'
        : lead.leadStatus === 'Qualified' ? 'qualified' : 'callback';
    const day = lead[prefix + 'AlertDate'];
    if (day) return new Date(day.slice(0, 10) + 'T' + (lead[prefix + 'AlertTime'] || '00:00'));
    return lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate) : null;
}

export function reminderGroup(lead, now) {
    const due = leadReminder(lead);
    if (!due || Number.isNaN(+due)) return null;
    if (due.toDateString() === now.toDateString()) return 'today';
    return due < now ? 'missed' : null;
}

export function proposalConfigUrl(sourceName, serviceType) {
    if (!serviceType || serviceType === 'All') return '/api/leads/config/' + encodeURIComponent(sourceName);
    return '/api/leads/config/' + encodeURIComponent('service:' + serviceType.toLowerCase())
        + '?fallback=' + encodeURIComponent(sourceName);
}

