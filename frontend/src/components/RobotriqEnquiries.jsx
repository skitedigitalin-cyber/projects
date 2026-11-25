import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

export const robotriqEnquiryStatuses = ['New', 'BOM Created', 'Quotation Created', 'Advance required', 'Material required', 'PO Received',
    'Proforma Invoice Created', 'Advance Received', 'Work in progress', 'Work Completed', 'Sale Created', 'Full Payment Received'];
const statuses = robotriqEnquiryStatuses;
const types = ['service', 'material', 'project', 'panel'];
const priorities = ['Low', 'Medium', 'High'];
const contactFields = [['customerName', 'Customer name'], ['companyName', 'Company'], ['phone', 'Phone'],
    ['email', 'Email'], ['application', 'Application'], ['reference', 'Reference']];
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const indiaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const dateValue = value => value?.slice(0, 10) || '';
const inputClass = 'rounded border bg-white px-3 py-2';
const actionClass = 'rounded bg-slate-900 px-3 py-2 text-white';

function daysOpen(row) {
    const start = dateValue(row.saleCreatedDate || row.createdAt);
    if (!start) return 'Day 1';
    const end = row.accountCompleted && row.accountCompletedDate
        ? indiaDate.format(new Date(row.accountCompletedDate)) : indiaDate.format(new Date());
    const elapsed = Math.floor((Date.parse(end) - Date.parse(start)) / 86400000);
    return elapsed < 0 ? `Starts in ${-elapsed} days` : `Day ${elapsed + 1}`;
}

export default function RobotriqEnquiries({ mode, canDelete, personal = false, initialStatus = '' }) {
    const direct = mode === 'direct';
    const accounts = mode === 'accounts';
    const endpoint = `${API_BASE_URL}/api/robotriq/${direct ? 'enquiries' : accounts ? 'sales-leads/accounts' : 'sales-leads'}`;
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: initialStatus, type: '', priority: '', from: '', to: '' });
    const staff = useMemo(() => new Map(data?.staff.map(person => [person._id, person.name])), [data]);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => {
            setData(result);
            setLoading(false);
        }).catch(() => {
            if (!controller.signal.aborted) {
                setMessage('Could not load enquiries.');
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [endpoint]);

    function edit(row) {
        setMessage('');
        setEditor({
            ...Object.fromEntries(contactFields.map(([field]) => [field, row?.[field] || ''])),
            _id: row?._id, updatedAt: row?.updatedAt ?? null, customer: row?.customer || '',
            assignedEmployee: row?.assignedEmployee || '', enquiryDetails: row?.enquiryDetails || '',
            type: row?.type || (personal ? 'service' : ''), status: row?.status || 'New', priority: row?.priority || 'Medium',
            enquiryDate: dateValue(row?.enquiryDate) || indiaDate.format(new Date()),
            commitmentDate: dateValue(row?.commitmentDate), saleCreatedDate: dateValue(row?.saleCreatedDate),
            advancePayment: row?.advancePayment ?? 0, fullPayment: row?.fullPayment ?? 0,
            accountCompleted: row?.accountCompleted || false
        });
    }

    function change(field, value) {
        setEditor(current => ({ ...current, [field]: value }));
    }

    async function mutate(method, url, payload, success) {
        setBusy(true);
        setMessage('');
        try {
            const { data: row } = await axios({ method, url, data: payload });
            setData(current => {
                let enquiries;
                if (method === 'delete') enquiries = current.enquiries.filter(entry => url !== `${endpoint}/${entry._id}`);
                else if (current.enquiries.some(entry => entry._id === row._id)) {
                    enquiries = current.enquiries.map(entry => entry._id === row._id ? row : entry);
                } else enquiries = [row, ...current.enquiries];
                return { ...current, enquiries };
            });
            setEditor(null);
            setMessage(success);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not update this enquiry.');
        } finally {
            setBusy(false);
        }
    }

    function save(event) {
        event.preventDefault();
        const form = accounts ? { phone: editor.phone, commitmentDate: editor.commitmentDate, updatedAt: editor.updatedAt } : editor;
        const payload = { ...form, fullPayment: Number(editor.fullPayment), advancePayment: Number(editor.advancePayment) };
        mutate(editor._id ? 'put' : 'post', editor._id ? `${endpoint}/${editor._id}` : endpoint, payload, 'Enquiry saved.');
    }

    const query = search.trim().toLowerCase();
    const visible = data?.enquiries.filter(row => {
        if (accounts && row.status !== 'Sale Created') return false;
        if (filters.status && (row.status || 'New').toLowerCase() !== filters.status.toLowerCase()) return false;
        if (filters.type && row.type !== filters.type) return false;
        if (filters.priority && (row.priority || 'Medium') !== filters.priority) return false;
        const saleDay = dateValue(row.saleCreatedDate || row.createdAt);
        if ((filters.from && saleDay < filters.from) || (filters.to && saleDay > filters.to)) return false;
        return !query || [row.enquiryId, row.customerName, row.companyName, row.phone, row.application]
            .some(value => value?.toLowerCase().includes(query));
    });
    const select = (field, label, options, value, onChange, empty) => <label className="grid gap-1" key={field}>{label}
        <select aria-label={label} className={inputClass} value={value} onChange={event => onChange(event.target.value)}>
            {empty && <option value="">{empty}</option>}
            {options.map(option => <option key={option}>{option}</option>)}
        </select>
    </label>;

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search enquiries
                <input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            {accounts ? [['from', 'Sale from'], ['to', 'Sale to']].map(([field, label]) =>
                <label key={field} className="grid gap-1">{label}
                    <input type="date" className={inputClass} value={filters[field]}
                        onChange={event => setFilters({ ...filters, [field]: event.target.value })} />
                </label>) : [['status', 'Status', statuses], ['type', 'Type', types], ['priority', 'Priority', priorities]]
                .map(([field, label, options]) => select(field, label,
                    filters[field] && !options.includes(filters[field]) ? [...options, filters[field]] : options, filters[field],
                    value => setFilters({ ...filters, [field]: value }), 'All'))}
            {!accounts && <button className={actionClass} type="button" disabled={!data || busy || !!editor}
                onClick={() => edit()}>Add enquiry</button>}
        </div>
        {message && <p role="status">{message}</p>}
        {loading && <p role="status">Loading enquiries…</p>}
        {editor && <form className="rounded border bg-white p-4" onSubmit={save}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <h2 className="font-semibold sm:col-span-2">{accounts ? 'Edit sale account' : editor._id ? 'Edit enquiry' : 'New enquiry'}</h2>
                {!accounts && <label className="grid gap-1">Linked customer
                    <select className={inputClass} value={editor.customer} onChange={event => {
                        const selected = data.customers.find(row => row._id === event.target.value);
                        setEditor(current => ({ ...current, customer: event.target.value,
                            ...(selected ? Object.fromEntries(contactFields.slice(0, 4)
                                .map(([field]) => [field, selected[field] || ''])) : {}) }));
                    }}>
                        <option value="">No linked customer</option>
                        {editor.customer && !data.customers.some(row => row._id === editor.customer) &&
                            <option value={editor.customer}>Legacy customer link</option>}
                        {data.customers.map(row => <option value={row._id} key={row._id}>{row.customerName} · {row.companyName}</option>)}
                    </select>
                </label>}
                {(accounts ? contactFields.filter(([field]) => field === 'phone') : contactFields).map(([field, label]) =>
                    <label className="grid gap-1" key={field}>{label}
                        <input className={inputClass} value={editor[field]} required={field === 'customerName'}
                            onChange={event => change(field, event.target.value)} />
                    </label>)}
                {!accounts && <>
                    <label className="grid gap-1 sm:col-span-2">Enquiry details
                        <textarea className={inputClass} value={editor.enquiryDetails}
                            onChange={event => change('enquiryDetails', event.target.value)} />
                    </label>
                    {!personal && select('type', 'Type', types, editor.type, value => change('type', value), 'Select type')}
                    {select('priority', 'Priority', priorities, editor.priority, value => change('priority', value))}
                    {select('status', 'Status', statuses.includes(editor.status) ? statuses : [...statuses, editor.status],
                        editor.status, value => change('status', value))}
                    {!personal && <label className="grid gap-1">Assigned staff
                        <select className={inputClass} value={editor.assignedEmployee} onChange={event => change('assignedEmployee', event.target.value)}>
                            <option value="">Unassigned</option>
                            {editor.assignedEmployee && !staff.has(editor.assignedEmployee) &&
                                <option value={editor.assignedEmployee}>Legacy assignee</option>}
                            {data.staff.map(row => <option key={row._id} value={row._id}>{row.name}</option>)}
                        </select>
                    </label>}
                </>}
                {(accounts ? [['commitmentDate', 'Commitment date']] : [['enquiryDate', 'Enquiry date'],
                    ['commitmentDate', 'Commitment date'], ['saleCreatedDate', 'Sale created date']]).map(([field, label]) =>
                    <label className="grid gap-1" key={field}>{label}
                        <input className={inputClass} type="date" value={editor[field]} required={field === 'enquiryDate'}
                            onChange={event => change(field, event.target.value)} />
                    </label>)}
                {[['advancePayment', 'Advance payment'], ['fullPayment', 'Full payment']].map(([field, label]) =>
                    <label className="grid gap-1" key={field}>{label}
                        <input className={inputClass} type="number" min="0" step="any" value={editor[field]}
                            disabled={editor.accountCompleted} onChange={event => change(field, event.target.value)} />
                    </label>)}
                <div className="flex gap-2 sm:col-span-2">
                    <button className={actionClass}>{accounts ? 'Save account' : 'Save enquiry'}</button>
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </fieldset>
        </form>}
        {visible?.length > 0 && <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-left text-sm">
                <thead><tr>{['Enquiry', 'Customer', ...(accounts ? ['Full payment', 'Advance', 'Balance', 'Commitment', 'Days'] :
                    ['Type', 'Status', 'Priority', 'Assigned staff']), 'Actions'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
                <tbody>{visible.map(row => <tr key={row._id} className="border-t">
                    <td className="p-3">{row.enquiryId}</td>
                    <td className="p-3">{row.customerName}<br />{row.companyName}{accounts && row.phone && <><br />{row.phone}</>}</td>
                    {(accounts ? [money.format(row.fullPayment || 0), money.format(row.advancePayment || 0),
                        money.format((row.fullPayment || 0) - (row.advancePayment || 0)), dateValue(row.commitmentDate) || '—', daysOpen(row)] :
                        [row.type || '—', row.status || 'New', row.priority || 'Medium',
                            staff.get(row.assignedEmployee) || (row.assignedEmployee ? 'Legacy assignee' : '—')])
                        .map((value, index) => <td key={index} className="p-3">{value}</td>)}
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" disabled={busy || !!editor} onClick={() => edit(row)}>Edit</button>
                        {accounts && (row.accountCompleted ? <span>Completed</span> :
                            <button type="button" disabled={busy || !!editor} onClick={() => {
                                if (window.confirm('Complete this account and clear its balance?')) {
                                    mutate('post', `${endpoint}/${row._id}/complete`, { updatedAt: row.updatedAt ?? null }, 'Account completed.');
                                }
                            }}>Complete account</button>)}
                        {!accounts && canDelete && <button type="button" disabled={busy || !!editor} onClick={() => {
                            if (window.confirm(`Delete enquiry ${row.enquiryId}?`)) {
                                mutate('delete', `${endpoint}/${row._id}`, undefined, 'Enquiry deleted.');
                            }
                        }}>Delete</button>}
                    </td>
                </tr>)}</tbody>
            </table>
        </div>}
        {visible?.length === 0 && <p>{accounts ? 'No matching sale accounts.' : 'No matching enquiries.'}</p>}
    </section>;
}
