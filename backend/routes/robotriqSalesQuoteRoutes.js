const express = require('express');
const mongoose = require('mongoose');
const Quote = require('../models/RobotriqSalesQuote');
const Item = require('../models/RobotriqItem');
const { SalesLead } = require('../models/RobotriqEnquiry');
const protect = require('../middleware/authMiddleware');
const nextRobotriqNumber = require('../utils/nextRobotriqNumber');
const { tenantId, requireRobotriqRole, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const sales = requireRobotriqSalesPermission('salesQuotation');
const admin = requireRobotriqRole('Admin');
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const nonnegative = value => Number.isFinite(value) && value >= 0;
const textFields = [
    'customerName', 'reference', 'application', 'phone', 'specNote', 'transportLabel',
    'validityLabel', 'netAmountLabel', 'bankName', 'branch', 'bobAc', 'ifsc', 'sigThanks', 'sigFor', 'sigName'
];

function details(body) {
    const { lead, date, items, transportPercent, transportOverride, gstPercent, validityDays } = body || {};
    if (!objectId(lead) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Array.isArray(items) || !items.length || !nonnegative(transportPercent) || !nonnegative(gstPercent) ||
        !(transportOverride == null || nonnegative(transportOverride)) || !Number.isSafeInteger(validityDays) || validityDays < 1) return null;
    const day = new Date(date);
    if (!Number.isFinite(day.getTime()) || !day.toISOString().startsWith(date)) return null;

    const lines = [];
    for (const row of items) {
        if (!objectId(row?.item) || !Number.isSafeInteger(row.qty) || row.qty < 1 || !nonnegative(row.salePrice)) return null;
        lines.push({ item: row.item, qty: row.qty, salePrice: row.salePrice, amount: row.qty * row.salePrice });
    }
    const totalAmount = lines.reduce((total, row) => total + row.amount, 0);
    const transportAmount = transportOverride ?? totalAmount * transportPercent / 100;
    const gstAmount = (totalAmount + transportAmount) * gstPercent / 100;
    const netAmount = totalAmount + transportAmount + gstAmount;
    if (!Number.isFinite(netAmount)) return null;

    const customData = {};
    for (const field of textFields) {
        if (typeof body.customData?.[field] === 'string') customData[field] = body.customData[field].trim();
    }
    if (Array.isArray(body.customData?.terms)) {
        customData.terms = body.customData.terms
            .filter(term => typeof term?.title === 'string' && typeof term?.desc === 'string')
            .map(({ title, desc }, i) => ({ id: i + 1, title: title.trim(), desc: desc.trim() }));
    }
    return {
        lead, date: day, items: lines, totalAmount, transportPercent, transportAmount,
        gstPercent, gstAmount, netAmount, validityDays,
        customData: { ...customData, date: date.split('-').reverse().join('/'), transportOverride: transportOverride ?? null }
    };
}

async function validReferences(quote, session = null) {
    const ids = [...new Set(quote.items.map(row => row.item.toLowerCase()))];
    const lead = await SalesLead.exists({ _id: quote.lead, tenantId }).session(session);
    return !!lead && await Item.countDocuments({ tenantId, _id: { $in: ids } }).session(session) === ids.length;
}

async function nextNumber(session) {
    const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
    return nextRobotriqNumber(Quote, 'quotationNo', `MP/${year}/`, `mine-power-quotations:${year}`, session);
}

router.use(protect);
router.get('/', sales, async (req, res) => {
    const [quotes, leads, items] = await Promise.all([
        Quote.find({ tenantId }).sort({ createdAt: -1, _id: -1 }).lean(),
        SalesLead.find({ tenantId }).select('enquiryId customerName companyName reference phone').sort({ enquiryId: 1 }).lean(),
        Item.find({ tenantId }).select('componentName description brand specification salePrice').sort({ componentName: 1 }).lean()
    ]);
    res.json({ quotes, leads, items });
});

router.post('/', sales, async (req, res) => {
    const quote = details(req.body);
    if (!quote) return res.status(400).json({ message: 'Enter a sales lead, quotation date, and valid item and tax details.' });
    let saved;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            saved = await mongoose.connection.transaction(async session => {
                if (!await validReferences(quote, session)) return null;
                const quotationNo = await nextNumber(session);
                const updated = await SalesLead.updateOne({ _id: quote.lead, tenantId },
                    { $set: { status: 'Quotation Created' } }, { session });
                if (!updated.matchedCount) return null;
                const [created] = await Quote.create([{ ...quote, tenantId, quotationNo,
                    customData: { ...quote.customData, quotationNo } }], { session });
                return created;
            });
            break;
        } catch (error) {
            if (error.code !== 11000 || attempt === 2) throw error;
        }
    }
    if (!saved) return res.status(400).json({ message: 'Choose a Robotriq sales lead and items from the catalog.' });
    res.status(201).json(saved);
});

router.param('id', (req, res, next, id) => {
    if (!objectId(id)) return res.status(404).json({ message: 'Quotation not found.' });
    next();
});

router.put('/:id', sales, async (req, res) => {
    const quote = details(req.body);
    if (!quote || !await validReferences(quote)) {
        return res.status(400).json({ message: 'Enter a Robotriq sales lead and valid quotation details.' });
    }
    const { customData, ...values } = quote;
    const updates = Object.fromEntries(Object.entries(customData).map(([field, value]) => [`customData.${field}`, value]));
    const saved = await Quote.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: { ...values, ...updates } }, { new: true });
    if (!saved) return res.status(404).json({ message: 'Quotation not found.' });
    res.json(saved);
});

router.delete('/:id', admin, async (req, res) => {
    const deleted = await Quote.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'Quotation not found.' });
    res.sendStatus(204);
});

module.exports = router;
