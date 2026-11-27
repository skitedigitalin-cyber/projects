export function leadReminder(lead) {
    if (!lead) return null;
    if (lead.leadStatus === 'Converted') return null;
    if (lead.leadStatus === 'Lost' && (lead.rejectedFromStage || '').toLowerCase() !== 'qualified') return null;

    const prefix = lead.leadStatus === 'Appointment' ? 'appointment'
        : (lead.leadStatus === 'Qualified' || (lead.rejectedFromStage || '').toLowerCase() === 'qualified') ? 'qualified' : 'callback';

    const day = lead[prefix + 'AlertDate'];
    if (day) {
        return new Date(day.slice(0, 10) + 'T' + (lead[prefix + 'AlertTime'] || '00:00'));
    }

    // Fallback to any other alert date set on the lead
    const fallbackDay = lead.callbackAlertDate || lead.qualifiedAlertDate || lead.appointmentAlertDate;
    const fallbackTime = lead.callbackAlertTime || lead.qualifiedAlertTime || lead.appointmentAlertTime || '00:00';
    if (fallbackDay) {
        return new Date(fallbackDay.slice(0, 10) + 'T' + fallbackTime);
    }

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

