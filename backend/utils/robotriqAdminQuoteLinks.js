const Lead = require('../models/Lead');
const { TrainingLead } = require('../models/RobotriqTrainingHistory');
const { DirectEnquiry } = require('../models/RobotriqEnquiry');
const Customer = require('../models/RobotriqCustomer');
const Item = require('../models/RobotriqItem');
const { AdminQuote } = require('../models/RobotriqDocumentHistory');
const { tenantId } = require('../middleware/robotriqStaff');

const models = new Map([
    ['training', Lead], ['legacy-training', TrainingLead], ['enquiry', DirectEnquiry], ['customer', Customer]
]);
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

async function validRobotriqQuoteLinks(link, items) {
    if (!Array.isArray(items)) return false;
    if (link != null) {
        if (!models.has(link.kind) || !validId(link.recordId)) return false;
        if (!await models.get(link.kind).exists({ tenantId, _id: link.recordId })) return false;
    }
    const catalogIds = items.map(row => row.catalogItemId).filter(id => id != null);
    if (!catalogIds.every(validId)) return false;
    const unique = [...new Set(catalogIds.map(id => id.toLowerCase()))];
    return !unique.length || await Item.countDocuments({ tenantId, _id: { $in: unique } }) === unique.length;
}

async function loadRobotriqQuoteOptions() {
    const [training, historicTraining, enquiries, customers, items, oldQuotes] = await Promise.all([
        Lead.find({ tenantId }).select('leadId customerName companyName mobileNumber').sort({ customerName: 1 }).lean(),
        TrainingLead.find({ tenantId }).select('currentLeadId codeNo name company mobile').lean(),
        DirectEnquiry.find({ tenantId }).select('enquiryId customerName companyName phone').sort({ customerName: 1 }).lean(),
        Customer.find({ tenantId }).select('customerName companyName phone').sort({ customerName: 1 }).lean(),
        Item.find({ tenantId }).select('componentName description brand specification salePrice').sort({ componentName: 1 }).lean(),
        AdminQuote.find({ tenantId, currentQuoteId: { $exists: true } }).select('currentQuoteId robotriqLead lead customer').lean()
    ]);
    const parties = [
        ...training.map(row => ({ kind: 'training', id: row._id, code: row.leadId, name: row.customerName,
            company: row.companyName, phone: row.mobileNumber })),
        ...historicTraining.filter(row => !row.currentLeadId).map(row => ({ kind: 'legacy-training', id: row._id, code: row.codeNo,
            name: row.name, company: row.company, phone: row.mobile })),
        ...enquiries.map(row => ({ kind: 'enquiry', id: row._id, code: row.enquiryId, name: row.customerName,
            company: row.companyName, phone: row.phone })),
        ...customers.map(row => ({ kind: 'customer', id: row._id, name: row.customerName, company: row.companyName, phone: row.phone }))
    ];
    const partyKeys = new Set(parties.map(row => `${row.kind}:${row.id}`));
    const oldTraining = new Map(historicTraining.map(row => [String(row._id), row]));
    const historicalLinks = {};
    for (const quote of oldQuotes) {
        const lead = oldTraining.get(String(quote.lead));
        const choices = [
            { kind: 'enquiry', recordId: quote.robotriqLead },
            { kind: 'training', recordId: lead?.currentLeadId },
            { kind: 'legacy-training', recordId: lead?._id },
            { kind: 'customer', recordId: quote.customer }
        ];
        const matched = choices.find(row => partyKeys.has(`${row.kind}:${row.recordId}`));
        if (matched) historicalLinks[String(quote.currentQuoteId)] = matched;
    }
    return { parties, items, historicalLinks };
}

module.exports = { validRobotriqQuoteLinks, loadRobotriqQuoteOptions };
