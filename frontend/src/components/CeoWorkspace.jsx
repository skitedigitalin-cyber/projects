import { useEffect, useState } from 'react';
import axios from 'axios';
import { compactRupees } from './DashboardNumbers';
import { invoicePaymentRows, summarizeAccounts } from '../utils/accountSummary';

const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const dateKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const pct = (numerator, denominator) => denominator > 0 ? Math.round(numerator / denominator * 100) : null;
const labelMonth = key => month.format(new Date(`${key}-01T00:00:00Z`));

function buildOverview(invoices, payments, dashboard) {
    const now = new Date();
    const summary = summarizeAccounts(invoices, payments, now);
    const total = summary.chart.reduce((sum, entry) => sum + entry.income, 0);
    const profit = summary.chart.reduce((sum, entry) => sum + entry.profit, 0);
    const currentDay = dateKey.format(now);
    const fiscalStart = `${summary.fiscalYear}-04-01`;
    const validDate = date => date && Number.isFinite(Date.parse(date));
    let billed = 0;
    let paid = 0;
    const feed = [];
    for (const invoice of invoices) {
        const invoiceTotal = Number(invoice.grandTotal) || 0;
        const history = invoicePaymentRows(invoice);
        if (validDate(invoice.invoiceDate)) {
            const date = dateKey.format(new Date(invoice.invoiceDate));
            if (date >= fiscalStart && date <= currentDay) {
                billed += invoiceTotal;
                paid += Math.min(invoiceTotal, Math.max(Number(invoice.paidAmount) || 0,
                    history.reduce((sum, item) => sum + item.amount, 0)));
            }
        }
        for (const item of history) {
            if (!validDate(item.date) || new Date(item.date) > now) continue;
            feed.push({ id: `payment-${item.key}`, date: item.date, text: `${item.clientName} paid ${item.invoiceNumber || 'an invoice'} · ${compactRupees(item.amount)}` });
        }
    }
    for (const lead of dashboard?.recentLeads || []) {
        if (!validDate(lead.createdAt) || new Date(lead.createdAt) > now) continue;
        feed.push({ id: `lead-${lead._id}`, date: lead.createdAt, text: `New lead: ${lead.customerName} · ${lead.leadSource || 'Direct'}` });
    }
    return { summary, total, profit, feed: feed.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 6), collectionRate: pct(paid, billed) };
}

export default function CeoWorkspace({ company }) {
    const [records, setRecords] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        const options = { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        const refresh = () => Promise.all(['invoices', 'payments', 'leads/dashboard-stats'].map(resource => axios.get(`http://localhost:5000/api/${resource}`, options)))
            .then(([invoices, payments, dashboard]) => {
                setRecords({ dashboard: dashboard.data, ...buildOverview(invoices.data, payments.data, dashboard.data) });
                setError('');
            })
            .catch(() => { if (!controller.signal.aborted) setError('Workspace analytics could not be loaded. Administration is still available below.'); });
        refresh();
        const interval = setInterval(() => { if (!document.hidden) refresh(); }, 60000);
        return () => { clearInterval(interval); controller.abort(); };
    }, []);

    const summary = records?.summary;
    const overview = records?.dashboard?.overview;
    const ratios = [
        ['Sales vs target', pct(records?.dashboard?.salesTarget?.collected, records?.dashboard?.salesTarget?.target), 'Target not configured'],
        ['Attendance', pct(overview?.attendance?.presentDays, overview?.attendance?.scheduledDays)],
        ['Collections', records?.collectionRate, 'FY invoices paid'],
        ['Project completion', pct(overview?.projects?.completed, overview?.projects?.total)],
    ];
    return (
        <div className="ceo-reference">
            <header className="ceo-reference-header">
                <span className="ceo-reference-brand"><i aria-hidden="true" /> <b>skite</b> <span>· CEO</span></span>
                {records && <span className="ceo-live">Live</span>}
            </header>
            <main className="ceo-reference-main">
                <div className="ceo-headline">
                    <p>{summary ? `FY ${summary.fiscalYear}–${String(summary.fiscalYear + 1).slice(-2)} · Apr to ${labelMonth(summary.chart.at(-1).month)}` : 'Workspace overview'}</p>
                    <h1>{records ? <>{compactRupees(records.total)} <span>earned.</span></> : 'CEO dashboard'}</h1>
                    {records && <div>{compactRupees(Math.abs(records.profit))} {records.profit >= 0 ? 'cash profit' : 'cash loss'} · {summary.clients.length} paying clients
                        {overview?.team && ` · ${overview.team.total} people`}{company && ` · ${company}`}</div>}
                </div>
                {error ? <p role="alert" className="ceo-card">{error}</p> : !records ? <p role="status" className="ceo-card">Loading workspace analytics…</p> : <>
                    <section className="ceo-ratios" aria-label="Workspace performance">
                        {ratios.map(([title, value, note]) => (
                            <article className="ceo-card" key={title}>
                                <header><h2>{title}</h2></header>
                                <strong>{value == null ? '—' : `${value}%`}</strong>
                                {value != null ? <progress value={Math.min(100, Math.max(0, value))} max="100" aria-label={note || title} /> : <small>{note || 'No data recorded'}</small>}
                            </article>
                        ))}
                    </section>
                    <div className="ceo-activity">
                        <section className="ceo-card" aria-labelledby="ceo-feed-title">
                            <h2 id="ceo-feed-title">Live feed</h2>
                            {records.feed.length ? <ul className="ceo-feed">{records.feed.map(item => (
                                <li key={item.id}><time dateTime={item.date}>{clock.format(new Date(item.date))}</time><span>{item.text}</span></li>
                            ))}</ul> : <p>No recent lead or payment activity.</p>}
                        </section>
                        <section className="ceo-card" aria-labelledby="ceo-people-title">
                            <h2 id="ceo-people-title">People this month</h2>
                            {overview?.team?.members.length ? <ul className="ceo-people">{overview.team.members.map(member => (
                                <li key={member.id}><span aria-hidden="true">{member.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
                                    <div><strong>{member.name}</strong><small>{member.completed} {member.completed === 1 ? 'task' : 'tasks'} done</small></div>
                                    <b>{member.completed}/{member.assigned}</b>
                                </li>
                            ))}</ul> : <p>No team data recorded.</p>}
                        </section>
                    </div>
                </>}
            </main>
        </div>
    );
}
