import { compactRupees } from './DashboardNumbers';

const money = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger',
});
const monthName = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const monthLabel = value => monthName.format(new Date(`${value}-01T00:00:00Z`));

function comparison(current, previous, month) {
    if (previous <= 0) return 'No previous-month comparison';
    const change = Math.round((current / previous - 1) * 100);
    return `${change > 0 ? '+' : ''}${change}% vs ${monthLabel(month)}`;
}

export default function AccountsOverview({ summary, failed }) {
    if (!summary) return <div className="accounts-card"><p role={failed ? 'alert' : 'status'}>{failed ? 'The accounts overview could not be loaded.' : 'Loading the accounts overview…'}</p></div>;
    const { current, previous, chart, expenses, clients } = summary;
    const margin = current.income > 0 ? Math.round(current.profit / current.income * 100) : null;
    const maxProfit = Math.max(1, ...chart.map(entry => Math.abs(entry.profit)));
    const maxExpense = Math.max(1, ...(expenses.map(([, value]) => value)));
    const clientTotal = clients.reduce((total, entry) => total + entry.amount, 0);
    return (
        <div className="accounts-overview">
            <section className="accounts-kpis" aria-label="Monthly cash totals">
                <article className="accounts-card"><h2>Income</h2><strong>{money.format(current.income)}</strong><p>{comparison(current.income, previous.income, previous.month)}</p></article>
                <article className="accounts-card"><h2>Expense</h2><strong>{money.format(current.expense)}</strong><p>{comparison(current.expense, previous.expense, previous.month)}</p></article>
                <article className="accounts-card accounts-net">
                    <h2>Net profit</h2><strong>{money.format(current.profit)}</strong>
                    <p>{margin === null ? 'No income recorded' : <><span>{margin}%</span> margin</>}</p>
                </article>
            </section>
            <section className="accounts-card accounts-chart" aria-labelledby="accounts-profit-title">
                <header><h2 id="accounts-profit-title">Profit by month</h2><span>{monthLabel(chart[0].month)} – {monthLabel(chart.at(-1).month)}</span></header>
                <ul style={{ '--account-months': chart.length }}>
                    {chart.map((entry, index) => (
                        <li key={entry.month} aria-label={`${monthLabel(entry.month)}: ${money.format(entry.profit)}`}
                            data-current={entry.month === current.month} data-loss={entry.profit < 0}
                            style={{ '--account-bar': `${Math.abs(entry.profit) / maxProfit * 100}%`, '--account-delay': `${index * 9}ms` }}>
                            <div aria-hidden="true"><span>{compactRupees(entry.profit)}</span><i /></div>
                            <small aria-hidden="true">{monthLabel(entry.month)}</small>
                        </li>
                    ))}
                </ul>
            </section>
            <div className="accounts-breakdown">
                <section className="accounts-card" aria-labelledby="accounts-expense-title">
                    <header><h2 id="accounts-expense-title">Where money went</h2></header>
                    {expenses.length ? <ul className="accounts-expenses">{expenses.slice(0, 5).map(([category, value]) => (
                        <li key={category}><div><span>{category}</span><strong>{money.format(value)}</strong></div>
                            <div aria-hidden="true"><span style={{ width: `${value / maxExpense * 100}%` }} /></div></li>
                    ))}</ul> : <p>No outgoing payments recorded this month.</p>}
                </section>
                <section className="accounts-card" aria-labelledby="accounts-clients-title">
                    <header><h2 id="accounts-clients-title">Top clients</h2><span>by collections, this FY</span></header>
                    {clients.length ? <ol className="accounts-clients">{clients.slice(0, 5).map((entry, index) => (
                        <li key={entry.id}><small>{String(index + 1).padStart(2, '0')}</small><span>{entry.name}</span>
                            <small>{Math.round(entry.amount / clientTotal * 100)}%</small><strong>{compactRupees(entry.amount)}</strong></li>
                    ))}</ol> : <p>No invoice collections recorded this fiscal year.</p>}
                </section>
            </div>
        </div>
    );
}
