const Quote = require('../models/Quote');
const mongoose = require('mongoose');
const { tenantId: robotriqTenantId } = require('../middleware/robotriqStaff');
const { validRobotriqQuoteLinks } = require('../utils/robotriqAdminQuoteLinks');
const nextRobotriqNumber = require('../utils/nextRobotriqNumber');
const { AdminQuote } = require('../models/RobotriqDocumentHistory');

const editableFields = new Set(['quoteNo', 'refNo', 'date', 'validUntil', 'clientDetails', 'items', 'subtotal',
    'taxRate', 'cgst', 'sgst', 'taxAmount', 'grandTotal', 'terms', 'status', 'templateType', 'customData', 'notes']);

async function saveRobotriqQuote(quote) {
    const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
    const prefix = `RQ/${year}/`;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await mongoose.connection.transaction(async session => {
                const historical = await AdminQuote.find({ tenantId: robotriqTenantId, quotationNo: { $regex: `^${prefix}[0-9]+$` } })
                    .select('quotationNo').session(session).lean();
                const minimum = historical.reduce((max, row) => Math.max(max, Number(row.quotationNo.slice(prefix.length))), 0);
                const quoteNo = await nextRobotriqNumber(Quote, 'quoteNo', prefix, `robotriq-admin-quotes:${year}`, session, minimum);
                const [saved] = await Quote.create([{ ...quote, quoteNo, customData: { ...quote.customData, quotationNo: quoteNo } }], { session });
                return saved;
            });
        } catch (error) {
            if (error.code !== 11000 || attempt === 2) throw error;
        }
    }
}

// GET /api/quotes - Fetch all quotations for the tenant
exports.getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find({ tenantId: req.user.tenantId })
            .sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// GET /api/quotes/:id - Fetch single quotation
exports.getQuoteById = async (req, res) => {
    try {
        const quote = await Quote.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!quote) return res.status(404).json({ message: 'Quotation not found' });
        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// POST /api/quotes - Create a new quotation
exports.createQuote = async (req, res) => {
    try {
        let { quoteNo, refNo, date, validUntil, clientDetails, items, subtotal, taxRate, cgst, sgst, taxAmount, grandTotal, terms, status, notes } = req.body;
        const robotriq = req.user.tenantId === robotriqTenantId;

        if (!clientDetails || !clientDetails.name) {
            return res.status(400).json({ message: 'Client name is required' });
        }

        // Auto-generate quote number if not provided
        if (!robotriq && (!quoteNo || quoteNo.trim() === '')) {
            const tenantId = req.user.tenantId;
            const isSkite = String(tenantId) === '6af2c94a9d29730751ed2d01';

            if (isSkite) {
                const quotes = await Quote.find({ tenantId }).select('quoteNo').lean();
                const highestNumber = quotes.reduce((highest, quote) => {
                    const serial = quote.quoteNo.match(/(\d+)\D*$/);
                    return serial ? Math.max(highest, Number(serial[1])) : highest;
                }, 0);
                quoteNo = `SKT${(highestNumber || quotes.length) + 1}`;
            } else {
                const count = await Quote.countDocuments({ tenantId });
                quoteNo = `RQ/2026/${(count + 1).toString().padStart(3, '0')}`;
            }
        }

        // Calculate totals if not provided or to ensure accuracy
        let calcSubtotal = 0;
        const processedItems = (items || [])
            .map((item, idx) => {
                const desc = item.description || item.componentText || `Item ${idx + 1}`;
                const price = Number(item.price) || Number(item.rate) || 0;
                const qty = Number(item.qty) || 1;
                const itemTotal = Number(item.total) || Number(item.amount) || (price * qty);
                calcSubtotal += itemTotal;
                return {
                    description: desc.trim(),
                    subDescription: item.subDescription || item.specifics || '',
                    hsn: item.hsn || item.make || '',
                    price,
                    qty,
                    total: itemTotal,
                    ...(robotriq && item.catalogItemId != null ? { catalogItemId: item.catalogItemId } : {})
                };
            });

        if (processedItems.length === 0 && (!req.body.customData || !req.body.customData.items?.length)) {
            return res.status(400).json({ message: 'At least one quotation item is required' });
        }

        const effectiveSubtotal = subtotal != null ? Number(subtotal) : calcSubtotal;
        const effectiveTaxRate = taxRate != null ? Number(taxRate) : 18;
        const halfRate = effectiveTaxRate / 2;
        const effectiveCgst = cgst != null ? Number(cgst) : Math.round(effectiveSubtotal * (halfRate / 100));
        const effectiveSgst = sgst != null ? Number(sgst) : Math.round(effectiveSubtotal * (halfRate / 100));
        const effectiveTaxAmount = taxAmount != null ? Number(taxAmount) : (effectiveCgst + effectiveSgst);
        const effectiveGrandTotal = grandTotal != null ? Number(grandTotal) : (effectiveSubtotal + effectiveTaxAmount);

        if (robotriq && !await validRobotriqQuoteLinks(req.body.robotriqLink, processedItems)) {
            return res.status(400).json({ message: 'Choose a Robotriq lead, enquiry, customer, or catalog item.' });
        }
        const values = {
            tenantId: req.user.tenantId,
            quoteNo,
            refNo: refNo || '',
            date: date || new Date(),
            validUntil: validUntil || null,
            clientDetails,
            items: processedItems,
            subtotal: effectiveSubtotal,
            taxRate: effectiveTaxRate,
            cgst: effectiveCgst,
            sgst: effectiveSgst,
            taxAmount: effectiveTaxAmount,
            grandTotal: effectiveGrandTotal,
            terms: terms || '',
            status: status || 'Sent',
            templateType: req.body.templateType || 'standard',
            customData: req.body.customData || {},
            notes: notes || '',
            ...(robotriq && req.body.robotriqLink ? { robotriqLink: req.body.robotriqLink } : {})
        };

        const newQuote = robotriq ? await saveRobotriqQuote(values) : await Quote.create(values);
        res.status(201).json(newQuote);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// PUT /api/quotes/:id - Update quotation
exports.updateQuote = async (req, res) => {
    try {
        const robotriq = req.user.tenantId === robotriqTenantId;
        const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => editableFields.has(key)));
        if (robotriq) delete changes.quoteNo;
        if (Array.isArray(changes.items)) {
            changes.items = changes.items
                .map((item, idx) => {
                    const desc = item.description || item.componentText || `Item ${idx + 1}`;
                    const price = Number(item.price) || Number(item.rate) || 0;
                    const qty = Number(item.qty) || 1;
                    const itemTotal = Number(item.total) || Number(item.amount) || (price * qty);
                    return {
                        description: desc.trim(),
                        subDescription: item.subDescription || item.specifics || '',
                        hsn: item.hsn || item.make || '',
                        price,
                        qty,
                        total: itemTotal,
                        ...(robotriq && item.catalogItemId != null ? { catalogItemId: item.catalogItemId } : {})
                    };
                });
        }
        if (robotriq) {
            const link = req.body?.robotriqLink;
            if (!await validRobotriqQuoteLinks(link, changes.items || [])) {
                return res.status(400).json({ message: 'Choose a Robotriq lead, enquiry, customer, or catalog item.' });
            }
            if (link !== undefined) changes.robotriqLink = link;
        }
        const quote = await Quote.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            { $set: changes },
            { new: true }
        );
        if (!quote) return res.status(404).json({ message: 'Quotation not found' });
        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// DELETE /api/quotes/:id - Delete quotation
exports.deleteQuote = async (req, res) => {
    try {
        const quote = await Quote.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!quote) return res.status(404).json({ message: 'Quotation not found' });
        res.json({ message: 'Quotation deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
