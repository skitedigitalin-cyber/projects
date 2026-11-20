import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, Plus } from 'lucide-react';
import Layout from '../components/Layout';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dashboardDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
const pipelineStages = [
    ['High intent', 'highIntentPct'],
    ['Nurture', 'nurturePct'],
    ['Discovery', 'discoveryPct'],
];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [status, setStatus] = useState('loading');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const token = localStorage.getItem('token');
        axios.get('http://localhost:5000/api/leads/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        }).then(({ data }) => {
            setStats(data);
            setStatus('ready');
        }).catch(() => {
            if (!controller.signal.aborted) setStatus('error');
        });
        return () => controller.abort();
    }, [attempt]);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    const recentLeads = stats?.recentLeads ?? [];
    const metric = value => status === 'ready' ? (value ?? 0) : '—';

    return (
        <Layout>
            <div className="workspace-dashboard" aria-busy={status === 'loading'}>
                <div className="workspace-intro">
                    <div>
                        <time className="workspace-date">{dashboardDate.format(now)}</time>
                        <h1>{greeting} <span>{status === 'ready' ? `${stats?.actionItemsCount ?? 0} action items need your attention.` : 'Here’s your workspace overview.'}</span></h1>
                    </div>
                    <div className="workspace-actions">
                        <Link to="/sales" className="workspace-button workspace-button-secondary">View pipeline</Link>
                        <Link to="/sales/lead/add" className="workspace-button"><Plus size={16} /> New lead</Link>
                    </div>
                </div>

                {status === 'error' && (
                    <div className="workspace-message" role="alert">
                        Dashboard data couldn’t be loaded.
                        <button className="workspace-text-link" type="button" onClick={() => { setStatus('loading'); setAttempt(attempt + 1); }}>Retry</button>
                    </div>
                )}

                <section className="workspace-kpis" aria-label="Key numbers">
                    <Link to="/sales" className="workspace-surface workspace-kpi workspace-kpi-primary workspace-card-link">
                        <span>Total pipeline</span>
                        <div><strong>{status === 'ready' ? currency.format(stats?.totalPipelineValue ?? 0) : '—'}</strong><span className="workspace-note">Live active value</span></div>
                    </Link>
                    <Link to="/sales" className="workspace-surface workspace-kpi workspace-card-link">
                        <span>Active leads</span>
                        <div><strong>{metric(stats?.activeLeadsCount)}</strong><span className="workspace-note">{metric(stats?.totalLeadsCount)} total leads</span></div>
                    </Link>
                    <Link to="/sales" className="workspace-surface workspace-kpi workspace-card-link">
                        <span>Escalations</span>
                        <div><strong>{metric(stats?.escalationsCount)}</strong><span className="workspace-note">Overdue follow-ups</span></div>
                    </Link>
                </section>

                <div className="workspace-grid">
                    <section className="workspace-surface" aria-labelledby="dashboard-today">
                        <div className="workspace-panel-heading"><h2 id="dashboard-today">Today</h2><Link className="workspace-text-link" to="/sales">Sales <ArrowUpRight size={14} /></Link></div>
                        <div className="workspace-stat-row"><span>Action items</span><strong>{metric(stats?.actionItemsCount)}</strong></div>
                        <div className="workspace-stat-row"><span>Pending calls</span><strong>{metric(stats?.pendingCallsCount)}</strong></div>
                        <div className="workspace-stat-row"><span>High-intent leads</span><strong>{metric(stats?.pipelineHealth?.hotCount)}</strong></div>
                    </section>
                    <section className="workspace-surface" aria-labelledby="dashboard-pipeline">
                        <div className="workspace-panel-heading"><h2 id="dashboard-pipeline">Pipeline</h2><span className="workspace-pill">{status === 'ready' ? `${stats?.conversionRate ?? '0.0'}% converted` : '—'}</span></div>
                        {pipelineStages.map(([label, key]) => {
                            const value = Number(stats?.pipelineHealth?.[key]) || 0;
                            return (
                                <label className="workspace-meter" key={key}>
                                    <span>{label} <strong>{status === 'ready' ? `${value}%` : '—'}</strong></span>
                                    <meter min="0" max="100" value={value} />
                                </label>
                            );
                        })}
                    </section>
                </div>

                <section className="workspace-surface" aria-labelledby="dashboard-recent">
                    <div className="workspace-panel-heading"><h2 id="dashboard-recent">Recent leads</h2><Link className="workspace-text-link" to="/sales">View all <ArrowUpRight size={14} /></Link></div>
                    {status === 'loading' && <p className="workspace-note" role="status">Loading leads…</p>}
                    {status === 'ready' && recentLeads.length === 0 && <p className="workspace-note">No active leads yet. <Link className="workspace-text-link" to="/sales/lead/add">Add a lead</Link></p>}
                    {recentLeads.map(lead => (
                        <Link className="workspace-lead" to="/sales" key={lead._id}>
                            <span className="workspace-lead-name"><strong>{lead.customerName}</strong><span className="workspace-note">{lead.companyName}</span></span>
                            <span className="workspace-note">{lead.leadSource}</span>
                            <span className="workspace-pill">{lead.leadStatus}</span>
                            <strong>{currency.format(Number(lead.leadValue) || 0)}</strong>
                        </Link>
                    ))}
                </section>
            </div>
        </Layout>
    );
}
