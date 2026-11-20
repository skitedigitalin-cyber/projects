import { useState } from 'react';
import { Search } from 'lucide-react';
import './SalesLeadList.css';

const filters = [
    ['All', () => true],
    ['New', lead => lead.leadStatus === 'New'],
    ['Callbacks', lead => /^Callback\b/i.test(lead.callStatus || '')],
    ['Appointments', lead => lead.leadStatus === 'Appointment'],
    ['Qualified', lead => lead.leadStatus === 'Qualified'],
    ['Lost', lead => lead.leadStatus === 'Lost'],
];
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dates = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const ownerName = lead => lead.assignedSalesperson?.name || '';
const PAGE_SIZE = 15;

function followUpDate(lead) {
    const callback = lead.callbackAlertDate && Date.parse(`${lead.callbackAlertDate}T${lead.callbackAlertTime || '00:00'}+05:30`);
    const next = lead.nextFollowUpDate && Date.parse(lead.nextFollowUpDate);
    return [callback, next].filter(Number.isFinite).sort((a, b) => a - b)[0];
}

function exportLeads(leads) {
    const safeCell = value => {
        const text = String(value ?? '');
        const escaped = /^[\s]*[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
        return '"' + escaped.replaceAll('"', '""') + '"';
    };
    const rows = [['Company', 'Contact', 'Phone', 'Temperature', 'Stage', 'Owner', 'Value'], ...leads.map(lead => [
        lead.companyName, lead.customerName, lead.mobileNumber, lead.leadTemperature, lead.leadStatus, ownerName(lead), lead.leadValue,
    ])];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(safeCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-leads.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SalesLeadList({ leads, loading, failed, onView, onBrowseSources }) {
    const [stage, setStage] = useState('All');
    const [term, setTerm] = useState('');
    const [owner, setOwner] = useState('');
    const [page, setPage] = useState(1);
    const groups = filters.map(([label, match]) => ({ label, items: leads.filter(match) }));
    const owners = [...new Set(leads.map(ownerName).filter(Boolean))].sort();
    const query = term.trim().toLowerCase();
    const items = groups.find(group => group.label === stage).items.filter(lead =>
        (!owner || ownerName(lead) === owner) &&
        (!query || [lead.companyName, lead.customerName, lead.mobileNumber, lead.email].some(value => String(value ?? '').toLowerCase().includes(query)))
    );
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const now = Date.now();

    return (
        <div className="sales-reference-list">
            <div className="sales-status-grid" aria-label="Filter by lead status">
                {groups.map(group => (
                    <button key={group.label} type="button" aria-pressed={stage === group.label} onClick={() => { setStage(group.label); setPage(1); }}>
                        <span>{group.label}</span><strong>{group.items.length}</strong>
                    </button>
                ))}
            </div>
            <section className="sales-list-panel" aria-labelledby="sales-list-heading" aria-busy={loading}>
                <header>
                    <h2 id="sales-list-heading">{stage === 'All' ? 'All leads' : stage}</h2>
                    <div className="sales-list-tools">
                        <label><Search size={14} aria-hidden="true" /><input type="search" aria-label="Search leads" placeholder="Search company, phone…" value={term} onChange={event => { setTerm(event.target.value); setPage(1); }} /></label>
                        <select aria-label="Filter by owner" value={owner} onChange={event => { setOwner(event.target.value); setPage(1); }}>
                            <option value="">Owner</option>
                            {owners.map(name => <option key={name}>{name}</option>)}
                        </select>
                        <button type="button" onClick={() => exportLeads(items)} disabled={!items.length}>Export</button>
                        <button type="button" onClick={onBrowseSources}>By source</button>
                    </div>
                </header>
                {items.length ? (
                    <div className="sales-table-scroll">
                        <table>
                            <thead><tr>{['Lead', 'Temp', 'Stage', 'Next follow-up', 'Owner', 'Value'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                            <tbody>
                                {items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(lead => {
                                    const date = followUpDate(lead);
                                    const overdue = date && date < now && !['Converted', 'Lost'].includes(lead.leadStatus);
                                    return (
                                        <tr key={lead._id}>
                                            <td><button type="button" onClick={() => onView(lead)}>{lead.companyName || lead.customerName}</button>
                                                <small>{[lead.companyName && lead.customerName, lead.mobileNumber].filter(Boolean).join(' · ')}</small></td>
                                            <td><span className="sales-temp" data-temp={lead.leadTemperature}>{lead.leadTemperature || '—'}</span></td>
                                            <td>{lead.leadStatus || 'New'}</td>
                                            <td className={overdue ? 'sales-overdue' : undefined}>{overdue ? 'Overdue' : date ? dates.format(date) : '—'}</td>
                                            <td>{ownerName(lead) || '—'}</td>
                                            <td>{money.format(Number(lead.leadValue) || 0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="sales-list-empty">{loading ? 'Loading leads…' : failed ? 'Leads could not be loaded.' : 'No leads match these filters.'}</p>}
                {pages > 1 && <footer><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>{current} / {pages}</span><button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></footer>}
            </section>
        </div>
    );
}
