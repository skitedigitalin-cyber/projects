const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const { uploadBufferToCloudinary } = require('../utils/cloudinary');

// Use in-memory storage: files are uploaded straight to Cloudinary without touching server disk
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Cloudinary Upload Endpoint for Payment Screenshots
router.post('/upload', auth, upload.single('paymentScreenshot'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadBufferToCloudinary(req.file.buffer, {
            folder: `skite_prime/tenants/${req.user?.tenantId || 'general'}/payment_screenshots`,
            resource_type: 'auto'
        });

        // Return the permanent, secure Cloudinary HTTPS URL to be stored in MongoDB
        res.json({ 
            fileUrl: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ message: 'Error uploading image to Cloudinary', error: error.message });
    }
});

// Config Routes
router.get('/config/:sourceName', auth, leadController.getConfig);
router.put('/config/:sourceName', auth, leadController.saveConfig);

// Lead Routes
router.get('/dashboard-stats', auth, leadController.getDashboardStats);
router.get('/', auth, leadController.getLeads);
router.post('/', auth, leadController.createLead);
router.put('/:id', auth, leadController.updateLead);
router.delete('/:id', auth, leadController.deleteLead);

module.exports = router;
