import { useState, useEffect } from 'react';
import axios from 'axios';
import './AccountsAnalysis.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function ProfitGraph() {
    const [invoices, setInvoices] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const [invRes, purRes, payRes] = await Promise.all([
                axios.get('http://localhost:5000/api/invoices', getHeaders()),
                axios.get('http://localhost:5000/api/purchases', getHeaders()).catch(() => ({ data: [] })),
                axios.get('http://localhost:5000/api/payments', getHeaders()).catch(() => ({ data: [] }))
            ]);

            setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
            setPurchases(Array.isArray(purRes.data) ? purRes.data : []);
            setPayments(Array.isArray(payRes.data) ? payRes.data : []);
        } catch (error) {
            console.error('Error fetching data for profit graph:', error);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Monthly Metrics for selectedYear
    const monthlyData = MONTHS.map((monthName, mIndex) => {
        // Income from Invoices created in this month
        const monthInvoices = invoices.filter(inv => {
            const d = new Date(inv.invoiceDate || inv.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex;
        });
        const invTotal = monthInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);

        // Additional Direct Income
        const monthDirectIncome = payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex && p.category === 'Direct Income';
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalIncome = invTotal + monthDirectIncome;

        // Expenses from Purchases
        const monthPurchases = purchases.filter(pur => {
            const d = new Date(pur.purchaseDate || pur.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex;
        });
        const purTotal = monthPurchases.reduce((sum, pur) => sum + (Number(pur.grandTotal) || 0), 0);

        // Additional Direct Expenses & Vendor Payouts
        const monthDirectExpenses = payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex && p.paymentType === 'Outward';
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalExpense = purTotal + monthDirectExpenses;
        const profit = totalIncome - totalExpense;
        const margin = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : '0.0';

        return {
            month: monthName,
            income: totalIncome,
            expense: totalExpense,
            profit,
            margin: Number(margin),
            invoicesCount: monthInvoices.length
        };
    });

    // Totals across the year
    const totalYearIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalYearExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
    const totalYearProfit = totalYearIncome - totalYearExpense;
    const yearMargin = totalYearIncome > 0 ? ((totalYearProfit / totalYearIncome) * 100).toFixed(1) : '0.0';
    const maxAmount = Math.max(1, ...monthlyData.flatMap(row => [row.income, row.expense]));
    const year = new Date().getFullYear();
    const activeMonth = monthlyData[hoveredMonthIndex];
    const summary = [
        ['Income', money.format(totalYearIncome)],
        ['Expenses', money.format(totalYearExpense)],
        [totalYearProfit < 0 ? 'Net loss' : 'Net profit', money.format(Math.abs(totalYearProfit))],
        ['Margin', `${yearMargin}%`],
    ];

    if (failed) return <p role="alert">Profit data is unavailable.</p>;
    if (loading) return <p role="status">Loading profit data…</p>;

    return (
        <div className="accounts-analysis">
            <header className="accounts-analysis-heading">
                <h2>{money.format(Math.abs(totalYearProfit))} {totalYearProfit < 0 ? 'loss' : 'profit'} <span>in {selectedYear}</span></h2>
                <div className="accounts-analysis-pills" role="group" aria-label="Profit year">
                    {[year, year - 1].map(value => (
                        <button key={value} type="button" aria-pressed={selectedYear === value} onClick={() => setSelectedYear(value)}>{value}</button>
                    ))}
                </div>
            </header>
            <dl className="accounts-analysis-summary">
                {summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <section className="accounts-analysis-panel" aria-labelledby="profit-chart-title">
                <header><h3 id="profit-chart-title">Income vs outward, by month</h3><span>Invoiced sales and direct income</span></header>
                <div className="accounts-analysis-chart-scroll">
                    <ul className="accounts-profit-bars" aria-label="Monthly income and expenses">
                        {monthlyData.map((row, index) => (
                            <li key={row.month}>
                                <button type="button"
                                    aria-label={`${row.month}, income ${money.format(row.income)}, expenses ${money.format(row.expense)}, profit ${money.format(row.profit)}`}
                                    onFocus={() => setHoveredMonthIndex(index)} onBlur={() => setHoveredMonthIndex(null)}
                                    onMouseEnter={() => setHoveredMonthIndex(index)} onMouseLeave={() => setHoveredMonthIndex(null)}
                                    onClick={() => setHoveredMonthIndex(index)}>
                                    <span aria-hidden="true">
                                        <i style={{ '--bar-height': `${Math.max(2, row.income / maxAmount * 100)}%` }} />
                                        <i style={{ '--bar-height': `${Math.max(2, row.expense / maxAmount * 100)}%` }} />
                                    </span>
                                    <small>{row.month}</small>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="accounts-analysis-chart-meta">
                    <span><i /> Income <i /> Expenses</span>
                    {activeMonth && <span>{activeMonth.month} · Profit {money.format(activeMonth.profit)} · {activeMonth.margin}% margin</span>}
                </div>
            </section>
            <section className="accounts-analysis-panel" aria-labelledby="profit-by-month-title">
                <header><h3 id="profit-by-month-title">Month by month</h3></header>
                <div className="accounts-analysis-table">
                    <table>
                        <thead><tr>{['Month','Invoices','Income','Expenses','Profit','Margin'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                        <tbody>{monthlyData.map(row => <tr key={row.month}>
                            <th scope="row">{row.month}</th><td>{row.invoicesCount}</td><td>{money.format(row.income)}</td>
                            <td>{money.format(row.expense)}</td><td data-negative={row.profit < 0}>{money.format(row.profit)}</td><td>{row.margin}%</td>
                        </tr>)}</tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
