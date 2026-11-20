const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});

module.exports = function summarizePipeline(leads, now) {
    const today = dayFormat.format(now);
    const stages = new Map();
    const followUps = [];
    for (const lead of leads) {
        const status = lead.leadStatus || 'New';
        if (status === 'Lost') continue;
        const stage = stages.get(status) || { name: status, count: 0, value: 0 };
        stage.count++;
        stage.value += Number(lead.leadValue) || 0;
        stages.set(status, stage);
        if (status === 'Converted') continue;

        const callback = lead.callbackAlertDate
            ? Date.parse(`${lead.callbackAlertDate}T${lead.callbackAlertTime || '00:00'}+05:30`)
            : NaN;
        const nextFollowUp = lead.nextFollowUpDate ? Date.parse(lead.nextFollowUpDate) : NaN;
        const scheduled = [callback, nextFollowUp].filter(Number.isFinite);
        if (!scheduled.length) continue;
        const timestamp = Math.min(...scheduled);
        if (dayFormat.format(timestamp) > today) continue;
        followUps.push({
            id: lead._id,
            name: lead.companyName || lead.customerName,
            status,
            date: new Date(timestamp),
            overdue: timestamp < now.getTime()
        });
    }
    const stageOrder = ['New', 'Lead', 'Contacted', 'Appointment', 'Qualified', 'Proposal Sent', 'Converted'];
    const rank = name => stageOrder.includes(name) ? stageOrder.indexOf(name) : stageOrder.length;
    return {
        stages: [...stages.values()].sort((a, b) => rank(a.name) - rank(b.name)),
        followUpCount: followUps.length,
        overdueFollowUpCount: followUps.filter(followUp => followUp.overdue).length,
        followUps: followUps.sort((a, b) => a.date - b.date).slice(0, 5)
    };
};
