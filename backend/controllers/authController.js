const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { cloudinary } = require('../utils/cloudinary');

// Register a new Client/Tenant and their Admin User
exports.registerClient = async (req, res) => {
    try {
        const { companyName, subDomain, adminName, adminEmail, adminPassword, plan = 'Free Trial', paymentId } = req.body;

        const normalizedEmail = adminEmail.trim().toLowerCase();
        // Check if user or employee email already exists across the system
        const existingEmail = await User.findOne({ email: normalizedEmail });
        const existingEmployee = await Employee.findOne({ email: normalizedEmail });
        if (existingEmail || existingEmployee) {
            return res.status(400).json({ message: 'An account or employee with this email already exists' });
        }

        // Enforce payment for paid subscription plans
        if (plan !== 'Free Trial' && (!paymentId || paymentId.trim() === '')) {
            return res.status(402).json({ 
                message: `Payment is required to subscribe to the ${plan} Plan. Please complete the payment to activate your workspace.` 
            });
        }

        // Calculate plan limits and trial duration
        const now = new Date();
        let validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        let status = 'trial';
        let maxEmployees = 5;
        let maxLeads = 50;
        let maxInvoices = 25;

        if (plan === 'Growth') {
            status = 'active';
            validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            maxEmployees = 25;
            maxLeads = 500;
            maxInvoices = 250;
        } else if (plan === 'Enterprise') {
            status = 'active';
            validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            maxEmployees = 99999;
            maxLeads = 99999;
            maxInvoices = 99999;
        }

        // Generate sanitized subdomain if empty
        const cleanedSubDomain = (subDomain || companyName.toLowerCase().replace(/[^a-z0-9]/g, '')) + '-' + Math.floor(100 + Math.random() * 900);

        // Create Tenant
        const tenant = new Tenant({
            companyName,
            subDomain: cleanedSubDomain,
            subscriptionPlan: plan,
            status,
            validUntil,
            maxEmployees,
            maxLeads,
            maxInvoices,
            lastPaymentId: paymentId || undefined,
            activeModules: ['dashboard', 'sales', 'finance', 'hr', 'calendar']
        });
        await tenant.save();

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create Admin User for this Tenant
        const adminUser = new User({
            tenantId: tenant._id,
            name: adminName,
            email: adminEmail.trim().toLowerCase(),
            password: hashedPassword,
            role: 'Admin',
            activeModules: ['dashboard', 'sales', 'finance', 'hr', 'calendar']
        });
        await adminUser.save();

        // Generate JWT Token for immediate login
        const token = jwt.sign(
            { userId: adminUser._id, tenantId: tenant._id, role: adminUser.role },
            process.env.JWT_SECRET || 'skite_secret_key',
            { expiresIn: '1d' }
        );

        const isSkiteTenant = tenant._id.toString() === '6af2c94a9d29730751ed2d01' || (tenant.companyName && tenant.companyName.toLowerCase().includes('skite'));

        res.status(201).json({
            message: 'Registration successful! Welcome to Skite Prime.',
            token,
            user: {
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
                tenantId: tenant._id,
                companyName: tenant.companyName,
                isSkiteTenant,
                activeModules: tenant.activeModules,
                theme: 'default',
                subscriptionPlan: tenant.subscriptionPlan,
                status: tenant.status,
                validUntil: tenant.validUntil
            }
        });
    } catch (error) {
        console.error('registerClient error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        let { email, password, role } = req.body;
        email = email.trim().toLowerCase();

        // Find user (with graceful fallback for CEO domain variants)
        let user = await User.findOne({ email });
        if (!user && (email === 'ceo@skite.com' || email === 'ceo@skiteprime.com')) {
            const altEmail = email === 'ceo@skite.com' ? 'ceo@skiteprime.com' : 'ceo@skite.com';
            user = await User.findOne({ email: altEmail });
        }
        if (!user) return res.status(404).json({ message: 'Invalid credentials (User not found)' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials (Password mismatch)' });

        if (!user.isActive) return res.status(403).json({ message: 'Your account is inactive' });

        // Role validated by user's account role in database

        // Get active modules: Admin/CEO gets tenant modules; regular employees get their strictly assigned activeModules
        const tenant = await Tenant.findById(user.tenantId);
        let activeModules = [];
        if (user.role === 'Admin' || user.role === 'CEO') {
            activeModules = (tenant && tenant.activeModules && tenant.activeModules.length > 0)
                ? tenant.activeModules
                : ['dashboard', 'sales', 'finance', 'hr', 'projects'];
        } else {
            activeModules = user.activeModules || [];
        }

        // Generate JWT Token containing user info and tenantId
        const token = jwt.sign(
            { userId: user._id, tenantId: user.tenantId, role: user.role },
            process.env.JWT_SECRET || 'skite_secret_key',
            { expiresIn: '1d' }
        );

        const isSkiteTenant = user.tenantId?.toString() === '6af2c94a9d29730751ed2d01' || (tenant?.companyName && tenant.companyName.toLowerCase().includes('skite'));

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                companyName: tenant?.companyName || '',
                isSkiteTenant,
                activeModules,
                theme: user.theme || 'default'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user || !user.isActive) return res.status(401).json({ message: 'User not found or inactive' });
        
        let activeModules = [];
        if (user.role === 'Admin' || user.role === 'CEO') {
            const tenant = await Tenant.findById(user.tenantId);
            activeModules = (tenant && tenant.activeModules && tenant.activeModules.length > 0)
                ? tenant.activeModules
                : ['dashboard', 'sales', 'finance', 'hr', 'projects'];
        } else {
            activeModules = user.activeModules || [];
        }
        
        const tenant = await Tenant.findById(user.tenantId);
        
        const isSkiteTenant = user.tenantId?.toString() === '6af2c94a9d29730751ed2d01' || (tenant?.companyName && tenant.companyName.toLowerCase().includes('skite')) || (user.email && user.email.toLowerCase().includes('skite'));

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            companyName: tenant?.companyName || '',
            isSkiteTenant,
            activeModules,
            theme: (user.theme && user.theme !== 'default') ? user.theme : (isSkiteTenant ? 'skite-orange' : 'default'),
            invoiceTemplate: tenant?.invoiceTemplate || 'skite-orange',
            invoiceLogo: tenant?.invoiceLogo || '',
            invoiceSign: tenant?.invoiceSign || '',
            invoiceSeal: tenant?.invoiceSeal || '',
            quotationHeaderImage: tenant?.quotationHeaderImage || '',
            quotationFooterImage: tenant?.quotationFooterImage || '',
            quotationSeal: tenant?.quotationSeal || tenant?.invoiceSeal || '',
            quotationSign: tenant?.quotationSign || tenant?.invoiceSign || '',
            quotationBankDetails: tenant?.quotationBankDetails || {},
            companyDetails: tenant?.companyDetails || {}
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Update User Theme
exports.updateTheme = async (req, res) => {
    try {
        const { theme } = req.body;
        const user = await User.findByIdAndUpdate(req.user.userId, { theme }, { new: true }).select('-password');
        res.json({ theme: user.theme });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ message: 'Server error updating theme' });
    }
};

// Update Tenant Invoice Template
exports.updateInvoiceTemplate = async (req, res) => {
    try {
        const { templateId, color, templateColors } = req.body;
        const update = { invoiceTemplate: templateId };
        if (color) update.invoiceColor = color;
        if (templateColors) update.templateColors = templateColors;

        const tenant = await Tenant.findByIdAndUpdate(
            req.user.tenantId, 
            { $set: update }, 
            { new: true }
        );
        res.json({ 
            invoiceTemplate: tenant ? tenant.invoiceTemplate : templateId,
            invoiceColor: tenant?.invoiceColor || color || '#FF4500',
            templateColors: tenant?.templateColors || {}
        });
    } catch (error) {
        console.error('Error updating invoice template:', error);
        res.status(500).json({ message: 'Server error updating invoice template' });
    }
};

// Update Tenant Invoice Branding (Logo, Sign, Company Details)
exports.updateInvoiceBranding = async (req, res) => {
    try {
        const { logo, sign, seal, companyDetails } = req.body;
        const updateFields = {};
        const tenantId = req.user.tenantId;

        // If logo is a base64 string, upload to Cloudinary and store the CDN URL
        if (logo !== undefined) {
            if (logo && logo.startsWith('data:image')) {
                const uploaded = await cloudinary.uploader.upload(logo, {
                    folder: `skite_prime/tenants/${tenantId}/branding`
                });
                updateFields.invoiceLogo = uploaded.secure_url;
            } else {
                updateFields.invoiceLogo = logo;
            }
        }

        // If sign is a base64 string, upload to Cloudinary and store the CDN URL
        if (sign !== undefined) {
            if (sign && sign.startsWith('data:image')) {
                const uploaded = await cloudinary.uploader.upload(sign, {
                    folder: `skite_prime/tenants/${tenantId}/branding`
                });
                updateFields.invoiceSign = uploaded.secure_url;
            } else {
                updateFields.invoiceSign = sign;
            }
        }

        // If seal is a base64 string, upload to Cloudinary and store the CDN URL
        if (seal !== undefined) {
            if (seal && seal.startsWith('data:image')) {
                const uploaded = await cloudinary.uploader.upload(seal, {
                    folder: `skite_prime/tenants/${tenantId}/branding`
                });
                updateFields.invoiceSeal = uploaded.secure_url;
            } else {
                updateFields.invoiceSeal = seal;
            }
        }

        // Quotation Header Image
        if (req.body.quotationHeaderImage !== undefined) {
            const qHeader = req.body.quotationHeaderImage;
            if (qHeader && qHeader.startsWith('data:image')) {
                try {
                    const uploaded = await cloudinary.uploader.upload(qHeader, {
                        folder: `skite_prime/tenants/${tenantId}/quotations`
                    });
                    updateFields.quotationHeaderImage = uploaded.secure_url;
                } catch (e) {
                    console.error('Cloudinary upload error for quotation header:', e.message);
                    updateFields.quotationHeaderImage = qHeader;
                }
            } else {
                updateFields.quotationHeaderImage = qHeader;
            }
        }

        // Quotation Footer Image
        if (req.body.quotationFooterImage !== undefined) {
            const qFooter = req.body.quotationFooterImage;
            if (qFooter && qFooter.startsWith('data:image')) {
                try {
                    const uploaded = await cloudinary.uploader.upload(qFooter, {
                        folder: `skite_prime/tenants/${tenantId}/quotations`
                    });
                    updateFields.quotationFooterImage = uploaded.secure_url;
                } catch (e) {
                    console.error('Cloudinary upload error for quotation footer:', e.message);
                    updateFields.quotationFooterImage = qFooter;
                }
            } else {
                updateFields.quotationFooterImage = qFooter;
            }
        }

        // Quotation Seal
        if (req.body.quotationSeal !== undefined) {
            const qSeal = req.body.quotationSeal;
            if (qSeal && qSeal.startsWith('data:image')) {
                try {
                    const uploaded = await cloudinary.uploader.upload(qSeal, {
                        folder: `skite_prime/tenants/${tenantId}/quotations`
                    });
                    updateFields.quotationSeal = uploaded.secure_url;
                } catch (e) {
                    updateFields.quotationSeal = qSeal;
                }
            } else {
                updateFields.quotationSeal = qSeal;
            }
        }

        // Quotation Sign
        if (req.body.quotationSign !== undefined) {
            const qSign = req.body.quotationSign;
            if (qSign && qSign.startsWith('data:image')) {
                try {
                    const uploaded = await cloudinary.uploader.upload(qSign, {
                        folder: `skite_prime/tenants/${tenantId}/quotations`
                    });
                    updateFields.quotationSign = uploaded.secure_url;
                } catch (e) {
                    updateFields.quotationSign = qSign;
                }
            } else {
                updateFields.quotationSign = qSign;
            }
        }

        if (req.body.quotationBankDetails !== undefined) {
            updateFields.quotationBankDetails = req.body.quotationBankDetails;
        }

        if (companyDetails !== undefined) updateFields.companyDetails = companyDetails;
        if (req.body.invoiceColor !== undefined) updateFields.invoiceColor = req.body.invoiceColor;
        if (req.body.templateColors !== undefined) updateFields.templateColors = req.body.templateColors;

        const tenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { $set: updateFields },
            { new: true }
        );

        res.json({
            success: true,
            invoiceTemplate: tenant?.invoiceTemplate || 'skite-orange',
            invoiceColor: tenant?.invoiceColor || '#FF4500',
            templateColors: tenant?.templateColors || {},
            invoiceLogo: tenant?.invoiceLogo || '',
            invoiceSign: tenant?.invoiceSign || '',
            invoiceSeal: tenant?.invoiceSeal || '',
            quotationHeaderImage: tenant?.quotationHeaderImage || '',
            quotationFooterImage: tenant?.quotationFooterImage || '',
            quotationSeal: tenant?.quotationSeal || tenant?.invoiceSeal || '',
            quotationSign: tenant?.quotationSign || tenant?.invoiceSign || '',
            quotationBankDetails: tenant?.quotationBankDetails || {},
            companyDetails: tenant?.companyDetails || {}
        });
    } catch (error) {
        console.error('Error updating invoice branding:', error);
        res.status(500).json({ message: 'Error updating invoice branding', error: error.message });
    }
};

// Get Tenant Invoice Branding
exports.getInvoiceBranding = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.user.tenantId);
        res.json({
            companyName: tenant?.companyName || '',
            invoiceTemplate: tenant?.invoiceTemplate || 'skite-orange',
            invoiceColor: tenant?.invoiceColor || '#FF4500',
            templateColors: tenant?.templateColors || {},
            invoiceLogo: tenant?.invoiceLogo || '',
            invoiceSign: tenant?.invoiceSign || '',
            invoiceSeal: tenant?.invoiceSeal || '',
            quotationHeaderImage: tenant?.quotationHeaderImage || '',
            quotationFooterImage: tenant?.quotationFooterImage || '',
            quotationSeal: tenant?.quotationSeal || tenant?.invoiceSeal || '',
            quotationSign: tenant?.quotationSign || tenant?.invoiceSign || '',
            quotationBankDetails: tenant?.quotationBankDetails || {},
            companyDetails: tenant?.companyDetails || {}
        });
    } catch (error) {
        console.error('Error getting invoice branding:', error);
        res.status(500).json({ message: 'Server error getting invoice branding' });
    }
};

