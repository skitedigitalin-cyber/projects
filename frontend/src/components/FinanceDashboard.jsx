import { useState, useEffect } from 'react';
import axios from 'axios';
import './FinanceDashboard.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function FinanceDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/finance/dashboard', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching finance stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p role="status">Loading financial overview…</p>;
    if (!stats) return <p role="alert">Financial overview is unavailable.</p>;

    const { totalIncome, totalExpenses, netProfit, metrics } = stats;
    const margin = totalIncome > 0 ? Math.round(netProfit / totalIncome * 100) : null;
    const summaries = [
        ['Total income', totalIncome, 'Invoiced sales + direct income'],
        ['Total expenses', totalExpenses, 'Purchases + direct expenses'],
        [netProfit < 0 ? 'Net loss' : 'Net profit', Math.abs(netProfit), margin == null ? 'Income less expenses' : `${margin}% margin`],
    ];
    const breakdowns = [
        {
            title: 'Income breakdown',
            direction: 'Inward',
            total: ['Cash received', metrics.totalReceived],
            rows: [
                ['Sales revenue', metrics.totalSalesRevenue, `${metrics.totalProductsSold} products sold`],
                ['Direct / other income', metrics.directIncome],
            ],
        },
        {
            title: 'Expense breakdown',
            direction: 'Outward',
            total: ['Cash paid', metrics.totalPaidOut],
            rows: [
                ['Cost of purchases', metrics.totalPurchasesCost, 'Inventory'],
                ['Direct / operating expenses', metrics.directExpense],
            ],
        },
    ];

    return (
        <div className="finance-overview">
            <dl className="finance-overview-summary">
                {summaries.map(([label, value, note]) => (
                    <div key={label}><dt>{label}</dt><dd>{money.format(value)}</dd><small>{note}</small></div>
                ))}
            </dl>
            <div className="finance-overview-breakdowns">
                {breakdowns.map(({ title, direction, total, rows }) => (
                    <section key={title}>
                        <header><h2>{title}</h2><span>{direction}</span></header>
                        <dl>
                            {rows.map(([label, value, note]) => (
                                <div key={label}><dt>{label}{note && <small>{note}</small>}</dt><dd>{money.format(value)}</dd></div>
                            ))}
                            <div className="finance-overview-cash"><dt>{total[0]}</dt><dd>{money.format(total[1])}</dd></div>
                        </dl>
                    </section>
                ))}
            </div>
        </div>
    );
}
