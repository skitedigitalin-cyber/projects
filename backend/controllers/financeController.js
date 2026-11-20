const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');

exports.getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Total Income from Products (Invoices)
        const invoices = await Invoice.find({ tenantId });
        const totalSalesRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalProductsSold = invoices.reduce((sum, inv) => {
            return sum + inv.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        }, 0);

        // 2. Total Cost of Goods (Purchases)
        const purchases = await Purchase.find({ tenantId });
        const totalPurchasesCost = purchases.reduce((sum, pur) => sum + (pur.grandTotal || 0), 0);

        // 3. Other Incomes & Expenses (Direct)
        const payments = await Payment.find({ tenantId });
        let directIncome = 0;
        let directExpense = 0;
        
        // Also compute total received/paid just in case
        let totalReceived = 0;
        let totalPaidOut = 0;

        payments.forEach(p => {
            if (p.paymentType === 'Inward') totalReceived += p.amount;
            if (p.paymentType === 'Outward') totalPaidOut += p.amount;

            if (p.category === 'Direct Income') directIncome += p.amount;
            if (p.category === 'Direct Expense') directExpense += p.amount;
        });

        // Profit Calculation
        // Gross Profit = Sales Revenue - Cost of Goods
        // Net Profit = (Sales Revenue + Direct Income) - (Cost of Goods + Direct Expense)
        const totalIncome = totalSalesRevenue + directIncome;
        const totalExpenses = totalPurchasesCost + directExpense;
        const netProfit = totalIncome - totalExpenses;

        res.json({
            totalIncome,
            totalExpenses,
            netProfit,
            metrics: {
                totalSalesRevenue,
                totalPurchasesCost,
                directIncome,
                directExpense,
                totalProductsSold,
                totalReceived,
                totalPaidOut
            }
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
