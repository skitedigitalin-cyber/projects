const FixedTemplate = require('../models/FixedTemplate');

const SKITE_TENANT_ID = '6af2c94a9d29730751ed2d01';

const isSkiteTenant = (tenantId) => {
    return tenantId && tenantId.toString() === SKITE_TENANT_ID;
};

// @desc    Get all fixed invoice / quote templates for tenant
// @route   GET /api/fixed-templates
// @access  Private
exports.getFixedTemplates = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        // Fixed templates feature is exclusive to Skite Digital Agency
        if (!isSkiteTenant(tenantId)) {
            return res.status(200).json([]);
        }

        const templates = await FixedTemplate.find({ tenantId }).sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        console.error('Error fetching fixed templates:', error);
        res.status(500).json({ message: 'Error fetching fixed templates', error: error.message });
    }
};

// @desc    Create a new fixed template
// @route   POST /api/fixed-templates
// @access  Private
exports.createFixedTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!isSkiteTenant(tenantId)) {
            return res.status(403).json({ message: 'Fixed templates feature is exclusive to Skite Digital Agency.' });
        }

        const { name, clientDetails, items, taxRate, notes } = req.body;

        if (!name || !clientDetails?.name) {
            return res.status(400).json({ message: 'Template name and client name are required' });
        }

        const template = new FixedTemplate({
            tenantId,
            name,
            clientDetails: {
                name: clientDetails.name,
                addressLine1: clientDetails.addressLine1 || '',
                addressLine2: clientDetails.addressLine2 || '',
                location: clientDetails.location || '',
                gstNo: clientDetails.gstNo || '',
                phone: clientDetails.phone || '',
                email: clientDetails.email || ''
            },
            items: Array.isArray(items) ? items.map(it => ({
                description: it.description || '',
                hsn: it.hsn || '',
                price: Number(it.price) || 0,
                qty: Number(it.qty) || 1
            })) : [],
            taxRate: taxRate !== undefined ? Number(taxRate) : 9,
            notes: notes || ''
        });

        await template.save();
        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating fixed template:', error);
        res.status(500).json({ message: 'Error creating fixed template', error: error.message });
    }
};

// @desc    Update an existing fixed template
// @route   PUT /api/fixed-templates/:id
// @access  Private
exports.updateFixedTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!isSkiteTenant(tenantId)) {
            return res.status(403).json({ message: 'Fixed templates feature is exclusive to Skite Digital Agency.' });
        }

        const { id } = req.params;
        const { name, clientDetails, items, taxRate, notes } = req.body;

        const template = await FixedTemplate.findOne({ _id: id, tenantId });
        if (!template) {
            return res.status(404).json({ message: 'Fixed template not found' });
        }

        if (name) template.name = name;
        if (clientDetails) {
            template.clientDetails = {
                name: clientDetails.name || template.clientDetails.name,
                addressLine1: clientDetails.addressLine1 !== undefined ? clientDetails.addressLine1 : template.clientDetails.addressLine1,
                addressLine2: clientDetails.addressLine2 !== undefined ? clientDetails.addressLine2 : template.clientDetails.addressLine2,
                location: clientDetails.location !== undefined ? clientDetails.location : template.clientDetails.location,
                gstNo: clientDetails.gstNo !== undefined ? clientDetails.gstNo : template.clientDetails.gstNo,
                phone: clientDetails.phone !== undefined ? clientDetails.phone : template.clientDetails.phone,
                email: clientDetails.email !== undefined ? clientDetails.email : template.clientDetails.email
            };
        }
        if (Array.isArray(items)) {
            template.items = items.map(it => ({
                description: it.description || '',
                hsn: it.hsn || '',
                price: Number(it.price) || 0,
                qty: Number(it.qty) || 1
            }));
        }
        if (taxRate !== undefined) {
            template.taxRate = Number(taxRate);
        }
        if (notes !== undefined) {
            template.notes = notes;
        }

        await template.save();
        res.status(200).json(template);
    } catch (error) {
        console.error('Error updating fixed template:', error);
        res.status(500).json({ message: 'Error updating fixed template', error: error.message });
    }
};

// @desc    Delete a fixed template
// @route   DELETE /api/fixed-templates/:id
// @access  Private
exports.deleteFixedTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!isSkiteTenant(tenantId)) {
            return res.status(403).json({ message: 'Fixed templates feature is exclusive to Skite Digital Agency.' });
        }

        const { id } = req.params;
        const template = await FixedTemplate.findOneAndDelete({ _id: id, tenantId });

        if (!template) {
            return res.status(404).json({ message: 'Fixed template not found' });
        }

        res.status(200).json({ message: 'Fixed template deleted successfully' });
    } catch (error) {
        console.error('Error deleting fixed template:', error);
        res.status(500).json({ message: 'Error deleting fixed template', error: error.message });
    }
};
