const businessDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function summarizeCollections(invoices, now = new Date()) {
    const today = businessDate.format(now);
    const month = today.slice(0, 7);
    const [year, monthNumber] = month.split('-').map(Number);
    const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
    const revenue = Array.from({ length: 6 }, (_, index) => ({
        month: new Date(Date.UTC(year, monthNumber - 6 + index, 1)).toISOString().slice(0, 7),
        invoiced: 0,
        collected: 0
    }));
    const revenueByMonth = new Map(revenue.map(entry => [entry.month, entry]));
    const dailyCollections = new Map();
    let collected = 0;
    let previousCollected = 0;
    let outstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    function addPayment(amount, date) {
        const timestamp = new Date(date);
        if (!date || !Number.isFinite(timestamp.getTime())) return;
        const day = businessDate.format(timestamp);
        if (day.startsWith(month) && day <= today) collected += amount;
        if (day.startsWith(previousMonth)) previousCollected += amount;
        if (day <= today) {
            dailyCollections.set(day, (dailyCollections.get(day) || 0) + amount);
            const period = revenueByMonth.get(day.slice(0, 7));
            if (period) period.collected += amount;
        }
    }

    for (const invoice of invoices) {
        const total = Number(invoice.grandTotal) || 0;
        const invoiceDate = new Date(invoice.invoiceDate);
        if (invoice.invoiceDate && Number.isFinite(invoiceDate.getTime())) {
            const day = businessDate.format(invoiceDate);
            const period = revenueByMonth.get(day.slice(0, 7));
            if (period && day <= today) period.invoiced += total;
        }
        let recorded = 0;
        for (const payment of invoice.payments || []) {
            const amount = Number(payment.amount) || 0;
            recorded += amount;
            addPayment(amount, payment.paymentDate);
        }
        const paid = Math.max(recorded, Number(invoice.paidAmount) || 0);
        // Older invoices can have a paid total without individual payment entries.
        addPayment(Math.max(0, paid - recorded), invoice.lastPaymentDate);
        const balance = invoice.paymentStatus === 'Paid' ? 0 : Math.max(0, total - paid);
        outstanding += balance;
        const due = new Date(invoice.dueDate);
        if (balance > 0 && invoice.dueDate && Number.isFinite(due.getTime()) && businessDate.format(due) < today) {
            overdueCount++;
            overdueAmount += balance;
        }
    }

    const midnight = Date.parse(today);
    const dayAt = offset => new Date(midnight + offset * 86400000).toISOString().slice(0, 10);
    const recentCollections = Array.from({ length: 14 }, (_, index) => {
        const date = dayAt(index - 13);
        return date.startsWith(month) ? (dailyCollections.get(date) || 0) : 0;
    });
    const week = Array.from({ length: 7 }, (_, index) => dailyCollections.get(dayAt(index - 6)) || 0);
    const precedingWeek = Array.from({ length: 7 }, (_, index) => dailyCollections.get(dayAt(index - 13)) || 0);
    const sum = values => values.reduce((total, value) => total + value, 0);
    const periods = {
        today: { collected: dailyCollections.get(today) || 0, comparison: dailyCollections.get(dayAt(-1)) || 0, bars: week.slice(-1) },
        week: { collected: sum(week), comparison: sum(precedingWeek), bars: week }
    };
    return { collected, previousCollected, previousMonth, outstanding, overdueAmount, overdueCount, recentCollections, revenue, periods };
}

module.exports = summarizeCollections;
