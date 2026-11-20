const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const startCronJobs = require('./utils/cronJobs');

const app = express();
const PORT = process.env.PORT || 5000;
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skitecrm')
    .then(() => {
        console.log('MongoDB Connected');
        startCronJobs(); // Start background jobs after DB connects
    })
    .catch(err => console.error('MongoDB Connection Error: ', err));

// Routes
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const checkSubscription = require('./middleware/subscriptionMiddleware');
const auth = require('./middleware/authMiddleware');
const protect = [auth, checkSubscription];

app.use('/api/auth', authRoutes);
app.use('/api/ceo', require('./routes/ceoRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));

app.use('/api/leads', protect, leadRoutes);
app.use('/api/customers', protect, customerRoutes);
app.use('/api/vendors', protect, vendorRoutes);
app.use('/api/invoices', protect, invoiceRoutes);
app.use('/api/quotes', protect, require('./routes/quoteRoutes'));
app.use('/api/fixed-templates', protect, require('./routes/fixedTemplateRoutes'));
app.use('/api/purchases', protect, purchaseRoutes);
app.use('/api/payments', protect, paymentRoutes);
app.use('/api/receipts', protect, require('./routes/receiptRoutes'));
app.use('/api/finance', protect, require('./routes/financeRoutes'));
app.use('/api/hr', protect, require('./routes/hrRoutes'));
app.use('/api/calendar', protect, require('./routes/calendar'));
app.use('/api/team-management', protect, require('./routes/teamManagementRoutes'));
app.use('/api/students', protect, require('./routes/studentRoutes'));

app.get('/', (req, res) => {
    res.send('Skite CRM API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

