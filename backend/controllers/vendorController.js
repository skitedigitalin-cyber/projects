const Vendor = require('../models/Vendor');

exports.getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createVendor = async (req, res) => {
    try {
        const payload = { ...req.body };
        payload.openingBalance = Number(payload.openingBalance) || 0;

        const vendor = new Vendor({
            ...payload,
            tenantId: req.user.tenantId
        });
        await vendor.save();
        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        Object.assign(vendor, req.body);
        await vendor.save(); // triggers pre-save hook to update payable amount

        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        res.json({ message: 'Vendor removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
