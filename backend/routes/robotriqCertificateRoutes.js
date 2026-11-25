const express = require('express');
const { createHash } = require('node:crypto');
const Certificate = require('../models/RobotriqCertificate');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole, requireRobotriqPermission } = require('../middleware/robotriqStaff');

const router = express.Router();
const fields = { studentName: 160, uid: 100, courseName: 220, brand: 160, products: 400 };
const required = ['studentName', 'uid', 'courseName'];

function certificate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
    const date = new Date(input.date);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.date) return null;
    const result = { date: input.date };
    for (const [field, length] of Object.entries(fields)) {
        const value = input[field];
        if (value != null && (typeof value !== 'string' || value.trim().length > length)) return null;
        result[field] = value?.trim() || '';
    }
    return required.every(field => result[field]) ? result : null;
}

const admin = requireRobotriqRole('Admin');
router.use(protect, requireRobotriqPermission('certifications'));

router.get('/', async (req, res) => {
    res.json(await Certificate.find({ tenantId }).sort({ date: -1, createdAt: -1, _id: -1 }).lean());
});

router.post('/', async (req, res) => {
    const values = certificate(req.body);
    if (!values) return res.status(400).json({ message: 'Enter a valid name, course, certificate UID, and issue date.' });
    if (await Certificate.exists({ tenantId, uid: values.uid })) {
        return res.status(409).json({ message: 'This certificate UID is already in use.' });
    }
    try {
        res.status(201).json(await Certificate.create({ ...values, tenantId, source: 'current' }));
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'This certificate UID is already in use.' });
        throw error;
    }
});

router.post('/import-history', admin, async (req, res) => {
    const { records } = req.body || {};
    if (!Array.isArray(records) || !records.length || records.length > 500) {
        return res.status(400).json({ message: 'Provide a legacy history file with 1 to 500 certificates.' });
    }
    const unique = new Map();
    for (const [index, input] of records.entries()) {
        const values = certificate(input);
        const validId = input && (typeof input.id === 'string' || Number.isSafeInteger(input.id));
        if (!values || !validId || !String(input.id).trim() || String(input.id).length > 100) {
            return res.status(400).json({ message: `Certificate history row ${index + 1} is invalid.` });
        }
        const legacyId = String(input.id);
        const historyKey = createHash('sha256').update(JSON.stringify([legacyId, values])).digest('hex');
        unique.set(historyKey, { ...values, tenantId, source: 'legacy', legacyId, historyKey });
    }
    const entries = [...unique.values()];
    const result = await Certificate.bulkWrite(entries.map(row => ({
        updateOne: {
            filter: { tenantId, source: 'legacy', historyKey: row.historyKey },
            update: { $setOnInsert: row }, upsert: true, timestamps: false
        }
    })));
    res.json({ imported: result.upsertedCount, alreadyPresent: records.length - result.upsertedCount });
});

router.delete('/:id', admin, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const result = await Certificate.deleteOne({ tenantId, _id: req.params.id });
    res.sendStatus(result.deletedCount ? 204 : 404);
});

module.exports = router;
