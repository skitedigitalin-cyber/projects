import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, DollarSign, PhoneCall, Users } from 'lucide-react';
import './DashboardSalesSnapshot.css';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });

export default function DashboardSalesSnapshot({ stats, loading, now }) {
    const health = stats?.pipelineHealth;
    const metrics = [
        ['Total pipeline', stats && rupees.format(stats.totalPipelineValue ?? 0), 'Live active value', DollarSign],
        ['Active leads', stats?.activeLeadsCount, stats && `${stats.totalLeadsCount ?? 0} total leads`, Users],
        ['Action items', stats?.actionItemsCount, stats && `${stats.pendingCallsCount ?? 0} pending calls`, PhoneCall],
        ['Escalations', stats?.escalationsCount, stats && (stats.escalationsCount > 0 ? 'Requires attention' : 'All clear'), AlertCircle],
    ];
    const collections = stats?.collections?.periods?.week?.bars;
    const maxCollection = Math.max(1, ...(collections ?? []));
    const recentLeads = stats?.recentLeads;
    const empty = loading ? 'Loading…' : 'Data unavailable';

    return (
        <section className="dashboard-sales" aria-labelledby="dashboard-sales-title" aria-busy={loading}>
            <h2 id="dashboard-sales-title">Sales snapshot</h2>
            <div className="dashboard-sales-metrics">
                {metrics.map(([label, value, note, Icon], index) => (
                    <Link key={label} to="/sales" className="dashboard-sales-metric" data-featured={index === 0}>
                        <span className="dashboard-sales-metric-label">{label}<Icon size={17} aria-hidden="true" /></span>
                        <strong>{value ?? '—'}</strong>
                        <small className={index === 3 && value > 0 ? 'dashboard-sales-attention' : undefined}>{note ?? empty}</small>
                    </Link>
                ))}
            </div>

            <div className="dashboard-sales-panels">
                <section className="dashboard-panel" aria-labelledby="dashboard-sales-revenue">
                    <header>
                        <h3 id="dashboard-sales-revenue">Revenue &amp; pipeline activity</h3>
                        <Link to="/sales">Full leads view <ArrowRight size={14} aria-hidden="true" /></Link>
                    </header>
                    <dl className="dashboard-sales-activity-totals">
                        <div><dt>Total pipeline</dt><dd>{metrics[0][1] ?? '—'}</dd></div>
                        <div><dt>Hot leads</dt><dd>{health?.hotCount ?? '—'}</dd></div>
                        <div><dt>Active contacts</dt><dd>{stats?.activeLeadsCount ?? '—'}</dd></div>
                    </dl>
                    {collections?.length ? (
                        <figure>
                            <figcaption>Payments collected in the last {collections.length} days</figcaption>
                            <ul className="dashboard-sales-bars">
                                {collections.map((amount, index) => {
                                    const day = dayLabel.format(now.getTime() - (collections.length - 1 - index) * 86400000);
                                    return <li key={day} title={`${day}: ${rupees.format(amount)}`}>
                                        <span aria-hidden="true" style={{ '--collection-height': `${Math.max(3, amount / maxCollection * 100)}%` }} />
                                        <small>{day}<span className="sr-only">: {rupees.format(amount)}</span></small>
                                    </li>;
                                })}
                            </ul>
                        </figure>
                    ) : <p className="dashboard-panel-muted">{loading ? 'Loading payments…' : 'Daily collections unavailable.'}</p>}
                </section>
                <section className="dashboard-panel dashboard-sales-health" aria-labelledby="dashboard-sales-health">
                    <header><h3 id="dashboard-sales-health">Pipeline health</h3></header>
                    <dl>
                        {[['High intent (hot)', health?.highIntentPct], ['Nurture (warm)', health?.nurturePct], ['Discovery (cold)', health?.discoveryPct]].map(([label, value]) => (
                            <div key={label}><dt>{label}</dt><dd>{value == null ? '—' : `${value}%`}</dd>
                                <span aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} /></span>
                            </div>
                        ))}
                    </dl>
                    <Link to="/sales" className="dashboard-sales-conversion">
                        <span>Overall conversion rate</span><strong>{stats ? `${stats.conversionRate ?? 0}%` : '—'}</strong>
                        <small>{stats ? `${stats.totalLeadsCount ?? 0} leads` : empty}</small>
                    </Link>
                </section>
            </div>

            <section className="dashboard-panel dashboard-sales-feed" aria-labelledby="dashboard-sales-feed">
                <header><h3 id="dashboard-sales-feed">Live deal feed</h3><Link to="/sales">View all pipeline <ArrowRight size={14} aria-hidden="true" /></Link></header>
                {recentLeads?.length ? <ul>
                    {recentLeads.map(lead => (
                        <li key={lead._id}><Link to="/sales">
                            <span className="dashboard-sales-avatar" aria-hidden="true">{lead.initials}</span>
                            <span className="dashboard-sales-person"><strong>{lead.customerName}</strong><small>{lead.companyName}</small></span>
                            <small className="dashboard-sales-source">{lead.leadSource}</small>
                            <span className="dashboard-sales-status" data-stage={lead.leadStatus}>{lead.leadStatus}</span>
                            <strong>{rupees.format(Number(lead.leadValue) || 0)}</strong>
                        </Link></li>
                    ))}
                </ul> : <p className="dashboard-panel-muted">{recentLeads ? 'No active leads found in this workspace.' : empty}{recentLeads && <Link to="/sales/lead/add">Add your first lead <ArrowRight size={14} aria-hidden="true" /></Link>}</p>}
            </section>
        </section>
    );
}
