const express = require('express');
const Item = require('../models/RobotriqItem');
const Bom = require('../models/RobotriqBom');
const Quote = require('../models/RobotriqSalesQuote');
const AdminQuote = require('../models/Quote');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqSalesPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const sales = requireRobotriqSalesPermission('salesItems');
const admin = requireRobotriqRole('Admin');
const textFields = ['componentName', 'category', 'brand', 'description', 'specification'];
const numberFields = ['purchasePrice', 'salePrice', 'stockQty'];

function fields(body) {
    const values = {};
    for (const field of textFields) {
        if (typeof body?.[field] !== 'string' && body?.[field] != null) return null;
        values[field] = (body?.[field] || '').trim();
    }
    for (const field of numberFields) {
        const input = body?.[field];
        if (input != null && typeof input !== 'string' && typeof input !== 'number') return null;
        const value = Number(input || 0);
        if (!Number.isFinite(value) || value < 0) return null;
        values[field] = value;
    }
    return values.componentName ? values : null;
}

router.use(protect);
router.get('/', sales, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
    const filter = { tenantId };
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = textFields.map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const page = Math.max(1, Math.min(10000, parseInt(req.query.page, 10) || 1));
    const size = 20;
    const [items, total] = await Promise.all([
        Item.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * size).limit(size).lean(),
        Item.countDocuments(filter)
    ]);
    res.json({ items, total, page, size });
});

router.post('/', sales, async (req, res) => {
    const item = fields(req.body);
    if (!item) return res.status(400).json({ message: 'Enter a component name and valid non-negative amounts.' });
    res.status(201).json(await Item.create({ ...item, tenantId }));
});

router.param('id', (req, res, next, id) => {
    if (!/^[a-f0-9]{24}$/i.test(id)) return res.status(404).json({ message: 'Item not found.' });
    next();
});

router.put('/:id', sales, async (req, res) => {
    const item = fields(req.body);
    if (!item) return res.status(400).json({ message: 'Enter a component name and valid non-negative amounts.' });
    const updated = await Item.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: item },
        { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Item not found.' });
    res.json(updated);
});

router.delete('/:id', admin, async (req, res) => {
    const reference = { tenantId, 'items.item': req.params.id };
    const linked = await Promise.all([
        Bom.exists(reference), Quote.exists(reference),
        AdminQuote.exists({ tenantId, 'items.catalogItemId': req.params.id })
    ]);
    if (linked.some(Boolean)) return res.status(409).json({ message: 'This item is linked to a BOM or quotation.' });
    const deleted = await Item.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'Item not found.' });
    res.sendStatus(204);
});

module.exports = router;
