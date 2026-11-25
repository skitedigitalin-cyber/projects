const express = require('express');
const mongoose = require('mongoose');
const Bom = require('../models/RobotriqBom');
const Item = require('../models/RobotriqItem');
const { SalesLead } = require('../models/RobotriqEnquiry');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const sales = requireRobotriqSalesPermission('salesBom');
const admin = requireRobotriqRole('Admin');
const objectId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const round = value => Number(value.toFixed(2));

function details(body) {
    if (!objectId(body?.lead) || !Array.isArray(body.items) || !body.items.length) return null;
    const items = [];
    let purchase = 0;
    let sale = 0;
    for (const row of body.items) {
        if (!objectId(row?.item) || ![row.qty, row.purchasePrice, row.salePrice].every(Number.isFinite)
            || row.qty <= 0 || row.purchasePrice < 0 || row.salePrice < 0) return null;
        items.push({ item: row.item, qty: row.qty, purchasePrice: row.purchasePrice, salePrice: row.salePrice });
        purchase += row.qty * row.purchasePrice;
        sale += row.qty * row.salePrice;
    }
    if (!Number.isFinite(purchase) || !Number.isFinite(sale)) return null;
    return {
        lead: body.lead, items, totalPurchaseAmount: round(purchase),
        totalSaleAmount: round(sale), netProfit: round(sale - purchase)
    };
}

async function validReferences(bom, session = null) {
    const itemIds = [...new Set(bom.items.map(row => row.item.toLowerCase()))];
    const lead = await SalesLead.exists({ _id: bom.lead, tenantId }).session(session);
    if (!lead) return false;
    const count = await Item.countDocuments({ tenantId, _id: { $in: itemIds } }).session(session);
    return count === itemIds.length;
}

router.use(protect);

router.get('/', sales, async (req, res) => {
    const [boms, leads, items] = await Promise.all([
        Bom.find({ tenantId }).sort({ createdAt: -1, _id: -1 }).lean(),
        SalesLead.find({ tenantId }).select('enquiryId customerName').sort({ enquiryId: 1 }).lean(),
        Item.find({ tenantId }).select('componentName purchasePrice salePrice').sort({ componentName: 1 }).lean()
    ]);
    res.json({ boms, leads, items });
});

router.post('/', sales, async (req, res) => {
    const bom = details(req.body);
    if (!bom) return res.status(400).json({ message: 'Choose a lead and enter valid item quantities and prices.' });
    const saved = await mongoose.connection.transaction(async session => {
        if (!await validReferences(bom, session)) return null;
        const updated = await SalesLead.updateOne({ _id: bom.lead, tenantId },
            { $set: { status: 'BOM created' } }, { session });
        if (!updated.matchedCount) return null;
        const [created] = await Bom.create([{ ...bom, tenantId }], { session });
        return created;
    });
    if (!saved) return res.status(400).json({ message: 'Choose a Robotriq sales lead and items from the catalog.' });
    res.status(201).json(saved);
});

router.param('id', (req, res, next, id) => {
    if (!objectId(id)) return res.status(404).json({ message: 'BOM not found.' });
    next();
});

router.put('/:id', sales, async (req, res) => {
    const bom = details(req.body);
    if (!bom || !await validReferences(bom)) {
        return res.status(400).json({ message: 'Choose a Robotriq sales lead, catalog items, and valid prices and quantities.' });
    }
    const saved = await Bom.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: bom }, { new: true });
    if (!saved) return res.status(404).json({ message: 'BOM not found.' });
    res.json(saved);
});

router.delete('/:id', admin, async (req, res) => {
    const deleted = await Bom.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'BOM not found.' });
    res.sendStatus(204);
});

module.exports = router;
