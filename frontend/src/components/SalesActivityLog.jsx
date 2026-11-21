import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, Phone, Search } from 'lucide-react';
import './SalesActivityLog.css';

export default function SalesActivityLog({ leads = [], onViewLead }) {
    // Date filter state - default to All Time so all historical actions are immediately visible
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Sub-filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'callback' | 'appointment' | 'qualified' | 'new' | 'lost'

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    // Quick Date Preset Handlers
    const setQuickPreset = (type) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (type === 'TODAY') {
            setDateFilter({ from: todayStr, to: todayStr });
        } else if (type === 'YESTERDAY') {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yestStr = yest.toISOString().split('T')[0];
            setDateFilter({ from: yestStr, to: yestStr });
        } else if (type === 'THIS_WEEK') {
            const firstDay = new Date(now);
            const dayOfWeek = now.getDay() || 7; // Sunday = 7
            firstDay.setDate(now.getDate() - dayOfWeek + 1);
            setDateFilter({
                from: firstDay.toISOString().split('T')[0],
                to: todayStr
            });
        } else if (type === 'THIS_MONTH') {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setDateFilter({ from: firstOfMonth, to: todayStr });
        } else if (type === 'ALL') {
            setDateFilter({ from: '', to: '' });
        }
    };

    // Extract all client action events from leads list
    const allActions = useMemo(() => {
        const actions = [];
        const hasFilter = Boolean(dateFilter.from && dateFilter.to);
        const fromTime = hasFilter ? new Date(`${dateFilter.from}T00:00:00`).getTime() : 0;
        const toTime = hasFilter ? new Date(`${dateFilter.to}T23:59:59.999`).getTime() : Infinity;

        const isWithinRange = (dateInput) => {
            if (!dateInput) return false;
            if (!hasFilter) return true;
            const t = new Date(dateInput).getTime();
            if (isNaN(t)) {
                const strTime = new Date(`${dateInput}T00:00:00`).getTime();
                return !isNaN(strTime) && strTime >= fromTime && strTime <= toTime;
            }
            return t >= fromTime && t <= toTime;
        };

        leads.forEach(lead => {
            const leadActionsForLead = [];

            // 1. Check callHistory array
            if (Array.isArray(lead.callHistory) && lead.callHistory.length > 0) {
                lead.callHistory.forEach((ch, idx) => {
                    if (isWithinRange(ch.date)) {
                        leadActionsForLead.push({
                            id: `${lead._id}-ch-${idx}`,
                            lead,
                            clientName: lead.customerName,
                            companyName: lead.companyName || '',
                            leadId: lead.leadId,
                            mobileNumber: lead.mobileNumber || '',
                            leadSource: lead.leadSource || 'Other',
                            leadStatus: lead.leadStatus || 'Contacted',
                            callStatus: ch.status || lead.callStatus || 'Call Logged',
                            actionType: ch.status || 'Call Logged',
                            date: ch.date,
                            notes: ch.notes || lead.callback1Description || lead.rejectReason || lead.notes || '',
                            category: ch.status?.includes('Callback') ? 'callback' : 
                                      (ch.status === 'Rejected' ? 'lost' : 
                                      (ch.status === 'Converted' ? 'converted' : 'call'))
                        });
                    }
                });
            }

            const isLeadLost = lead.leadStatus === 'Lost' || lead.callStatus === 'Rejected';
            const isLeadConverted = lead.leadStatus === 'Converted' || lead.callStatus === 'Converted';

            // 2. Check scheduled callbackAlertDate
            if (lead.callbackAlertDate && isWithinRange(lead.callbackAlertDate)) {
                const numMatch = (lead.callStatus || '').match(/\d+/);
                const descKey = numMatch ? `callback${numMatch[0]}Description` : 'callback1Description';
                const desc = lead[descKey] || lead.callback1Description || lead.notes || '';
                leadActionsForLead.push({
                    id: `${lead._id}-callback`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Contacted'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Callback'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : `Follow-up Due: ${lead.callStatus || 'Callback'}`,
                    date: `${lead.callbackAlertDate}T${lead.callbackAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${desc ? ` · ${desc}` : ''}` : desc)
                        : desc,
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'callback')
                });
            }

            // 3. Check appointmentAlertDate
            if (lead.appointmentAlertDate && isWithinRange(lead.appointmentAlertDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-appointment`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Appointment'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Appointment'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : 'Appointment Scheduled',
                    date: `${lead.appointmentAlertDate}T${lead.appointmentAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${lead.appointmentDetails ? ` · Details: ${lead.appointmentDetails}` : ''}` : (lead.appointmentNotes || lead.appointmentDetails || ''))
                        : (lead.appointmentNotes || lead.appointmentDetails || ''),
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'appointment')
                });
            }

            // 4. Check qualifiedAlertDate
            if (lead.qualifiedAlertDate && isWithinRange(lead.qualifiedAlertDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-qualified`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Qualified'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Qualified'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : 'Lead Qualified Alert',
                    date: `${lead.qualifiedAlertDate}T${lead.qualifiedAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${lead.qualifiedDetails ? ` · Details: ${lead.qualifiedDetails}` : ''}` : (lead.qualifiedDetails || lead.qualifiedNotes || ''))
                        : (lead.qualifiedNotes || lead.qualifiedDetails || ''),
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'qualified')
                });
            }

            // 5. Check Inbound / Creation Date
            const creationDate = lead.date || (lead.createdAt ? new Date(lead.createdAt).toISOString().slice(0, 10) : '');
            if (creationDate && isWithinRange(creationDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-creation`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || 'New',
                    callStatus: lead.callStatus || 'Lead',
                    actionType: `New Lead Inbound (${lead.leadSource || 'Direct'})`,
                    date: lead.createdAt || creationDate,
                    notes: lead.productServiceInterested ? `Interested in: ${lead.productServiceInterested}` : (lead.notes || ''),
                    category: 'new'
                });
            }

            // 6. Check status update via updatedAt if not captured yet
            if (leadActionsForLead.length === 0 && lead.updatedAt && isWithinRange(lead.updatedAt) && lead.callStatus && lead.callStatus !== 'Lead') {
                leadActionsForLead.push({
                    id: `${lead._id}-updated`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus,
                    callStatus: lead.callStatus,
                    actionType: `Status Updated to ${lead.callStatus}`,
                    date: lead.updatedAt,
                    notes: lead.rejectReason || lead.notes || '',
                    category: lead.leadStatus === 'Lost' ? 'lost' : 'call'
                });
            }

            // Deduplicate actions for same lead having identical actionType & date
            const uniqueForLead = [];
            const seenKeys = new Set();
            leadActionsForLead.forEach(item => {
                const dateKey = String(item.date).slice(0, 10);
                const key = `${item.leadId}_${item.actionType.slice(0, 15)}_${dateKey}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueForLead.push(item);
                }
            });

            actions.push(...uniqueForLead);
        });

        // Sort newest action first
        return actions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [leads, dateFilter.from, dateFilter.to]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter.from, dateFilter.to, searchTerm, categoryFilter]);

    // Filter actions by search and category
    const filteredActions = useMemo(() => {
        return allActions.filter(act => {
            const matchesSearch = !searchTerm || 
                act.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.leadId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.mobileNumber?.includes(searchTerm) ||
                act.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.actionType?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (categoryFilter === 'callback') return act.category === 'callback';
            if (categoryFilter === 'appointment') return act.category === 'appointment';
            if (categoryFilter === 'qualified') return act.category === 'qualified';
            if (categoryFilter === 'new') return act.category === 'new';
            if (categoryFilter === 'lost') return act.category === 'lost';

            return true;
        });
    }, [allActions, searchTerm, categoryFilter]);

    // Pagination calculations (15 records per page)
    const totalPages = Math.ceil(filteredActions.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedActions = filteredActions.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    // Metrics for the selected date range
    const metrics = useMemo(() => {
        const total = allActions.length;
        const callbacks = allActions.filter(a => a.category === 'callback').length;
        const appointments = allActions.filter(a => a.category === 'appointment').length;
        const qualified = allActions.filter(a => a.category === 'qualified').length;
        const newInbound = allActions.filter(a => a.category === 'new').length;
        const lost = allActions.filter(a => a.category === 'lost').length;
        return { total, callbacks, appointments, qualified, newInbound, lost };
    }, [allActions]);

    const categories = [
        ['ALL', 'All actions', metrics.total],
        ['callback', 'Callbacks', metrics.callbacks],
        ['appointment', 'Appointments', metrics.appointments],
        ['qualified', 'Qualified', metrics.qualified],
        ['new', 'New leads', metrics.newInbound],
        ['lost', 'Lost / rejected', metrics.lost],
    ];

    return (
        <div className="sales-activity">
            <section className="sales-list-panel" aria-labelledby="sales-activity-title">
                <header className="sales-activity-intro">
                    <div>
                        <h2 id="sales-activity-title">Client activity log</h2>
                        <p>Who was contacted, what happened, and where each lead stands.</p>
                    </div>
                    <div className="sales-activity-presets" role="group" aria-label="Date presets">
                        {[
                            ['TODAY', 'Today'], ['YESTERDAY', 'Yesterday'], ['THIS_WEEK', 'This week'],
                            ['THIS_MONTH', 'This month'], ['ALL', 'All time'],
                        ].map(([id, label]) => (
                            <button key={id} type="button" onClick={() => setQuickPreset(id)}>{label}</button>
                        ))}
                    </div>
                </header>
                <div className="sales-activity-date">
                    <label>From<input type="date" value={dateFilter.from} onChange={event => setDateFilter({ ...dateFilter, from: event.target.value })} /></label>
                    <label>To<input type="date" value={dateFilter.to} onChange={event => setDateFilter({ ...dateFilter, to: event.target.value })} /></label>
                    {(dateFilter.from || dateFilter.to) && <button type="button" onClick={() => setQuickPreset('ALL')}>Clear filter</button>}
                    <p aria-live="polite">Showing {filteredActions.length} of {allActions.length} actions</p>
                </div>
            </section>

            <div className="sales-status-grid sales-activity-categories" role="group" aria-label="Activity categories">
                {categories.map(([id, label, count]) => (
                    <button key={id} type="button" aria-pressed={categoryFilter === id} onClick={() => setCategoryFilter(id)}>
                        <span>{label}</span><strong>{count}</strong>
                    </button>
                ))}
            </div>

            <section className="sales-list-panel sales-activity-table" aria-labelledby="sales-activity-table-title">
                <header>
                    <h2 id="sales-activity-table-title">{categories.find(([id]) => id === categoryFilter)[1]}</h2>
                    <div className="sales-list-tools">
                        <label><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search actions" placeholder="Search actions" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label>
                    </div>
                </header>
                <div className="sales-table-scroll">
                    <table>
                        <thead><tr>{['When', 'Client', 'Lead status', 'Action', 'Notes', 'Contact'].map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
                        <tbody>
                            {paginatedActions.map(act => (
                                <tr key={act.id}>
                                    <td>
                                        <time>{act.date ? new Date(act.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</time>
                                        <small>{act.date && String(act.date).includes('T') ? new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : act.lead?.callbackAlertTime}</small>
                                    </td>
                                    <td><button type="button" onClick={() => onViewLead?.(act.lead)}>{act.clientName || 'Unnamed client'}</button>
                                        <small>{[act.companyName, act.leadId, act.leadSource].filter(Boolean).join(' · ')}</small>
                                    </td>
                                    <td><span className="sales-activity-badge" data-stage={act.leadStatus}>{act.leadStatus}</span></td>
                                    <td><span className="sales-activity-badge" data-category={act.category}>{act.actionType}</span></td>
                                    <td>{act.notes || '—'}</td>
                                    <td><div className="sales-activity-contact">
                                        {act.mobileNumber && <>
                                            <a href={`tel:${act.mobileNumber}`} aria-label={`Call ${act.clientName}`}><Phone size={15} /></a>
                                            <a href={`https://wa.me/${act.mobileNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label={`Message ${act.clientName} on WhatsApp`}><MessageCircle size={15} /></a>
                                        </>}
                                        <button type="button" onClick={() => onViewLead?.(act.lead)}>View</button>
                                    </div></td>
                                </tr>
                            ))}
                            {!paginatedActions.length && <tr><td colSpan={6} className="sales-activity-empty">No matching actions.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <footer>
                    <p>Page {validPage} of {totalPages} · {PAGE_SIZE} per page</p>
                    <button type="button" onClick={() => setCurrentPage(validPage - 1)} disabled={validPage <= 1}><ChevronLeft size={14} /> Prev</button>
                    <button type="button" onClick={() => setCurrentPage(validPage + 1)} disabled={validPage >= totalPages}>Next <ChevronRight size={14} /></button>
                </footer>
            </section>
        </div>
    );
}
