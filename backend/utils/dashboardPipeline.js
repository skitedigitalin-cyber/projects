const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
});

const stageOrder = ['New', 'Lead', 'Contacted', 'Appointment', 'Qualified', 'Proposal Sent', 'Converted'];
const rank = name => stageOrder.includes(name) ? stageOrder.indexOf(name) : stageOrder.length;

function aggregateStages(leadsList) {
    const stages = new Map();
    let totalValue = 0;
    let dealCount = 0;

    for (const lead of leadsList) {
        const status = lead.leadStatus || 'New';
        if (status === 'Lost') continue;
        const stage = stages.get(status) || { name: status, count: 0, value: 0 };
        stage.count++;
        const val = Number(lead.leadValue) || 0;
        stage.value += val;
        stages.set(status, stage);
        totalValue += val;
        dealCount++;
    }

    return {
        stages: [...stages.values()].sort((a, b) => rank(a.name) - rank(b.name)),
        totalValue,
        dealCount
    };
}

module.exports = function summarizePipeline(leads, now = new Date()) {
    const today = dayFormat.format(now);
    const midnight = Date.parse(today);
    const dayAt = offset => new Date(midnight + offset * 86400000).toISOString().slice(0, 10);
    const weekStart = dayAt(-6);
    const monthPrefix = today.slice(0, 7);

    const followUps = [];

    const getLeadDate = (lead) => {
        if (lead.createdAt) {
            const d = dayFormat.format(new Date(lead.createdAt));
            if (d) return d;
        }
        return lead.date || '';
    };

    const leadsToday = [];
    const leadsWeek = [];
    const leadsAll = [];

    for (const lead of leads) {
        const status = lead.leadStatus || 'New';
        if (status === 'Lost') continue;
        leadsAll.push(lead);

        const leadDate = getLeadDate(lead);

        if (leadDate === today) {
            leadsToday.push(lead);
        }
        if (leadDate >= weekStart && leadDate <= today) {
            leadsWeek.push(lead);
        }

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

    const todayPipeline = aggregateStages(leadsToday);
    const weekPipeline = aggregateStages(leadsWeek);
    const allPipeline = aggregateStages(leadsAll);

    return {
        stages: allPipeline.stages,
        totalPipelineValue: allPipeline.totalValue,
        dealCount: allPipeline.dealCount,
        pipelinePeriods: {
            today: todayPipeline,
            week: weekPipeline,
            month: allPipeline,
            all: allPipeline
        },
        followUpCount: followUps.length,
        overdueFollowUpCount: followUps.filter(followUp => followUp.overdue).length,
        followUps: followUps.sort((a, b) => a.date - b.date).slice(0, 5)
    };
};
