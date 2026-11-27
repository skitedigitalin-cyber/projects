import { useNavigate } from 'react-router-dom';
import './DashboardNumbers.css';

const rupees = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });

export function compactRupees(value) {
    if (value >= 1e7) return `₹${Number((value / 1e7).toFixed(2))}Cr`;
    if (value >= 1e5) return `₹${Number((value / 1e5).toFixed(2))}L`;
    return rupees.format(value);
}

export default function DashboardNumbers({ stats, loading, period }) {
    const navigate = useNavigate();
    const finance = stats?.collections;
    const selected = finance?.periods?.[period];
    const collected = period === 'month' ? finance?.collected : selected?.collected;
    const comparison = period === 'month' ? finance?.previousCollected : selected?.comparison;
    const bars = (period === 'month' ? finance?.recentCollections : selected?.bars) ?? [];
    const highest = Math.max(1, ...bars);
    const change = comparison > 0
        ? Math.round((collected / comparison - 1) * 100)
        : null;
    const previous = period === 'today' ? 'yesterday' : period === 'week' ? 'previous 7 days' : finance?.previousMonth
        ? monthName.format(new Date(`${finance.previousMonth}-01T00:00:00Z`))
        : null;
    const collectionLabel = { today: 'Collected today', week: 'Collected in the last 7 days', month: 'Collected this month' }[period];
    const count = finance?.overdueCount;
    const fallback = loading ? 'Loading' : 'Data unavailable';

    const periodWinsCount = period === 'today'
        ? (stats?.periodWins?.today ?? 0)
        : period === 'week'
        ? (stats?.periodWins?.week ?? 0)
        : (stats?.monthlyWins ?? stats?.periodWins?.month ?? 0);
    const periodWinsLabel = period === 'today' ? 'won today' : period === 'week' ? 'won this week' : 'won this month';
    const conversionNote = stats?.periodWins || stats?.monthlyWins != null
        ? `${periodWinsCount} ${periodWinsLabel}`
        : stats?.convertedCount != null
        ? `${stats.convertedCount} won overall`
        : stats
        ? 'Overall lead conversion'
        : fallback;

    return (
        <section className="dashboard-numbers" aria-label="Key numbers" aria-busy={loading}>
            <article
                className="dashboard-number dashboard-number-collected dashboard-card-clickable"
                onClick={() => navigate('/finance')}
                role="button"
                tabIndex={0}
                title="View Finance & Collections"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/finance'); } }}
            >
                <div className="dashboard-collection-value">
                    <span className="dashboard-number-label">{collectionLabel}</span>
                    <strong>{collected != null ? rupees.format(collected) : '—'}</strong>
                    <span className="dashboard-number-note">
                        {change !== null && <span className="dashboard-number-change">{change > 0 ? '+' : ''}{change}%</span>}
                        {collected != null ? (change === null ? 'No previous-period comparison' : `vs ${previous}`) : fallback}
                    </span>
                </div>
                {bars.length > 0 && (
                    <div className="dashboard-spark" key={period} role="img" aria-label={collectionLabel}>
                        {bars.map((amount, index) => (
                            <span
                                key={index}
                                title={rupees.format(amount)}
                                style={{ '--bar-size': `${amount > 0 ? 10 + 85 * amount / highest : 3}%`, '--bar-order': index }}
                            />
                        ))}
                    </div>
                )}
            </article>
            <article
                className="dashboard-number dashboard-card-clickable"
                onClick={() => navigate('/sales')}
                role="button"
                tabIndex={0}
                title="View Sales & Conversion"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/sales'); } }}
            >
                <span className="dashboard-number-label">Conversion</span>
                <div className="dashboard-number-detail">
                    <strong>{stats ? `${Number(stats.conversionRate ?? 0)}%` : '—'}</strong>
                    <span className="dashboard-number-note">{conversionNote}</span>
                </div>
            </article>
            <article
                className="dashboard-number dashboard-card-clickable"
                onClick={() => navigate('/finance')}
                role="button"
                tabIndex={0}
                title="View Finance & Outstanding Invoices"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/finance'); } }}
            >
                <span className="dashboard-number-label">Outstanding</span>
                <div className="dashboard-number-detail">
                    <strong title={finance ? rupees.format(finance.outstanding) : undefined}>{finance ? compactRupees(finance.outstanding) : '—'}</strong>
                    <span className={count > 0 ? 'dashboard-number-note dashboard-number-overdue' : 'dashboard-number-note'}>
                        {finance ? (count === 1 ? '1 invoice overdue' : `${count} invoices overdue`) : fallback}
                    </span>
                </div>
            </article>
        </section>
    );
}
