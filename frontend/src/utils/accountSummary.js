const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function invoicePaymentRows(invoice) {
    const clientName = invoice.customerId?.customerName || invoice.customerId?.companyName || invoice.clientDetails?.name || 'Customer';
    const base = { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber || '', clientName };
    const history = invoice.payments || invoice.paymentHistory || [];
    if (history.length) {
        return history.map((payment, index) => ({
            ...base, key: `${invoice._id}-${index}`, paymentIndex: index,
            amount: Number(payment.amount) || 0, date: payment.paymentDate || payment.date || invoice.lastPaymentDate || invoice.invoiceDate,
            isLegacy: false,
        })).filter(row => row.amount > 0);
    }
    const paid = Number(invoice.paidAmount) || 0;
    return paid > 0 ? [{
        ...base, key: invoice._id, paymentIndex: -1, amount: paid,
        date: invoice.lastPaymentDate || invoice.invoiceDate || invoice.date || invoice.createdAt, isLegacy: true,
    }] : [];
}

export function summarizeAccounts(invoices, payments, now = new Date()) {
    const today = dayFormat.format(now);
    const [year, monthNumber] = today.split('-').map(Number);
    const fiscalYear = monthNumber >= 4 ? year : year - 1;
    const fiscalStart = `${fiscalYear}-04`;
    const currentMonth = today.slice(0, 7);
    const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
    const months = new Map();
    const expenses = new Map();
    const clients = new Map();
    const add = (date, income, expense, category, client) => {
        const value = new Date(date);
        if (!date || !Number.isFinite(value.getTime())) return;
        const day = dayFormat.format(value);
        if (day > today) return;
        const month = day.slice(0, 7);
        const totals = months.get(month) || { month, income: 0, expense: 0 };
        totals.income += income;
        totals.expense += expense;
        months.set(month, totals);
        if (expense && month === currentMonth) expenses.set(category, (expenses.get(category) || 0) + expense);
        if (client && income && month >= fiscalStart) {
            const existing = clients.get(client.id) || { ...client, amount: 0 };
            existing.amount += income;
            clients.set(client.id, existing);
        }
    };

    for (const invoice of invoices) {
        const name = invoice.customerId?.companyName || invoice.customerId?.customerName || invoice.clientDetails?.name || 'Customer';
        const id = invoice.customerId?._id || (typeof invoice.customerId === 'string' ? invoice.customerId : name);
        for (const row of invoicePaymentRows(invoice)) add(row.date, row.amount, 0, null, { id, name });
    }
    for (const payment of payments) {
        const amount = Number(payment.amount) || 0;
        const date = payment.paymentDate || payment.date || payment.createdAt;
        if (payment.paymentType === 'Outward') add(date, 0, amount, payment.category || 'Other');
        if (payment.paymentType === 'Inward' && payment.category !== 'Customer Payment' && !payment.invoiceId) {
            add(date, amount, 0);
        }
    }
    const readMonth = month => {
        const totals = months.get(month) || { month, income: 0, expense: 0 };
        return { ...totals, profit: totals.income - totals.expense };
    };
    const chart = Array.from({ length: (monthNumber + 8) % 12 + 1 }, (_, index) =>
        readMonth(new Date(Date.UTC(fiscalYear, index + 3, 1)).toISOString().slice(0, 7))
    );
    return {
        fiscalYear, chart, current: readMonth(currentMonth), previous: readMonth(previousMonth),
        expenses: [...expenses].sort((a, b) => b[1] - a[1]),
        clients: [...clients.values()].sort((a, b) => b.amount - a.amount),
    };
}
