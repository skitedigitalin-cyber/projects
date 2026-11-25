import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search } from 'lucide-react';
import '../pages/Finance.css';
import './FinanceDocuments.css';
import './FinanceLedger.css';
import Layout from './Layout';
import API_BASE_URL from '../api';

const api = `${API_BASE_URL}/api/robotriq/ledger`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const inputClass = 'min-w-0 rounded-xl border border-[#e6e6e3] bg-[#f5f5f3] px-3 py-2 text-xs focus:bg-white';
const actionClass = 'finance-document-primary text-xs font-semibold disabled:opacity-50';
const tabs = [['transactions', 'Transactions'], ['income', 'Income'], ['expenses', 'Expenses'],
    ['profit', 'Profit'], ['employee', 'Employee expenses']];
const receipt = row => row.type === 'Income' && row.desc?.startsWith('Receipt:');

function summary(rows, employee) {
    const inType = employee ? 'Allocation' : 'Income';
    const incoming = rows.filter(row => row.type === inType).reduce((sum, row) => sum + Number(row.amount), 0);
    const outgoing = rows.filter(row => row.type === 'Expense' || (employee && !row.type))
        .reduce((sum, row) => sum + Number(row.amount), 0);
    return [[employee ? 'Allocated' : 'Income', incoming], [employee ? 'Spent' : 'Expenses', outgoing],
        [employee ? 'Balance' : 'Cash in hand', incoming - outgoing]];
}

function expenseBalances(rows) {
    const wallet = new Map();
    const timeline = new Map();
    const chronological = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || '') ||
        (a.createdAt || '').localeCompare(b.createdAt || '') || a._id.localeCompare(b._id));
    for (const row of chronological) {
        const balance = wallet.get(row.employeeId) || 0;
        const amount = Math.round(Number(row.amount) * 100);
        const allocation = row.type === 'Allocation';
        const covered = allocation ? amount : Math.min(amount, Math.max(0, balance));
        const after = balance + (allocation ? amount : -amount);
        wallet.set(row.employeeId, after);
        timeline.set(row._id, [covered, amount - covered, after].map(value => value / 100));
    }
    return { wallet, timeline };
}

function Profit({ rows }) {
    const months = new Map();
    for (const row of rows) {
        const month = /^\d{4}-\d{2}/.exec(row.date || '')?.[0] || 'Undated';
        if (!months.has(month)) months.set(month, { month, Income: 0, Expenses: 0 });
        months.get(month)[row.type === 'Income' ? 'Income' : 'Expenses'] += Number(row.amount);
    }
    const values = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
    if (!values.length) return <p>No transactions in this period.</p>;
    const max = Math.max(1, ...values.flatMap(row => [row.Income, row.Expenses]));
    return <div className="robotriq-table-card robotriq-table-scroll">
        <table className="w-full text-left text-sm">
            <thead><tr>{['Month', 'Income', 'Expenses', 'Profit'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
            <tbody>{values.map(row => <tr key={row.month} className="border-t">
                <th scope="row" className="p-3">{row.month}</th>
                {[[row.Income, 'bg-teal-700'], [row.Expenses, 'bg-amber-700']].map(([value, tone]) =>
                    <td key={tone} className="min-w-28 p-3">
                        {money.format(value)}
                        <div className="mt-1 h-1.5 rounded bg-slate-100" aria-hidden="true">
                            <div className={`h-full rounded ${tone}`} style={{ width: `${Math.max(0, value) / max * 100}%` }} />
                        </div>
                    </td>)}
                <td className="p-3 whitespace-nowrap tabular-nums">{money.format(row.Income - row.Expenses)}</td>
            </tr>)}</tbody>
        </table>
    </div>;
}

export default function RobotriqLedger({ self = false, expenseManagement = false, delegated = false }) {
    const [tab, setTab] = useState(self || expenseManagement ? 'employee' : 'transactions');
    const employee = tab === 'employee';
    const endpoint = `${api}/${self ? 'my-expenses' : employee ? 'expenses' : 'accounts'}`;
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [filters, setFilters] = useState({ search: '', from: '', to: '', employeeId: '' });
    const description = employee ? 'description' : 'desc';

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => {
            setData(Array.isArray(result) ? { rows: result, staff: [] } : { rows: result.expenses, staff: result.staff });
            setLoading(false);
        }).catch(() => {
            if (!controller.signal.aborted) {
                setStatus('Could not load the ledger.');
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [endpoint]);

    function switchTab(next) {
        if ((next === 'employee') !== employee) {
            setData(null);
            setLoading(true);
        }
        setTab(next);
        setEditor(null);
        setStatus('');
        setFilters({ search: '', from: '', to: '', employeeId: '' });
    }

    async function mutate(method, suffix, payload, success) {
        setBusy(true);
        setStatus('');
        try {
            const { data: saved } = await axios({ method, url: endpoint + suffix, data: payload });
            setData(current => {
                let rows;
                if (method === 'delete') rows = current.rows.filter(row => suffix !== `/${row._id}`);
                else if (current.rows.some(row => row._id === saved._id)) {
                    rows = current.rows.map(row => row._id === saved._id ? saved : row);
                } else rows = [saved, ...current.rows];
                return { ...current, rows };
            });
            setEditor(null);
            setStatus(success);
        } catch (error) {
            setStatus(error.response?.data?.message || 'Could not update this entry.');
        } finally {
            setBusy(false);
        }
    }

    function open(row) {
        setStatus('');
        setEditor(row || { date: today(), status: 'Pending',
            type: expenseManagement ? 'Allocation' : employee || tab === 'expenses' ? 'Expense' : 'Income' });
    }

    const search = filters.search.trim().toLowerCase();
    const rows = data?.rows.filter(row => {
        if ((tab === 'income' && row.type !== 'Income') || (tab === 'expenses' && row.type !== 'Expense')) return false;
        if (filters.employeeId && row.employeeId !== filters.employeeId) return false;
        if ((filters.from && row.date < filters.from) || (filters.to && row.date > filters.to)) return false;
        return !search || [row[description], row.employeeName, row.type, row.status].some(value => value?.toLowerCase().includes(search));
    });
    const employeeOptions = [...new Map([
        ...(data?.rows || []).map(row => [row.employeeId, row.employeeName]),
        ...(data?.staff || []).map(row => [row._id, row.name])
    ]).entries()].filter(([id]) => id).sort((a, b) => a[1].localeCompare(b[1]));

    const balances = employee && data ? expenseBalances(data.rows) : null;
    const totals = rows ? summary(rows, employee) : [];
    if (balances) {
        const balance = filters.employeeId ? balances.wallet.get(filters.employeeId) || 0
            : [...balances.wallet.values()].reduce((sum, value) => sum + value, 0);
        totals[2] = [filters.employeeId || self ? 'Wallet balance' : 'Combined wallet balance', balance / 100];
    }
    const content = (
        <div className="finance-workspace robotriq-accounts">
            {!expenseManagement && !delegated && <header className="finance-workspace-heading">
                <div><p>Accounts & finance</p><h1>{self ? 'My expenses' : 'Accounts Hub'}</h1></div>
            </header>}
                {!self && !expenseManagement && <nav className="finance-workspace-tabs" aria-label="Ledger views">{tabs.filter(([id]) => !delegated || id !== 'employee').map(([id, label]) =>
                    <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} disabled={busy}
                        onClick={() => switchTab(id)}>{label}</button>)}</nav>}
            <section className="finance-document-list">
                {rows && <dl className="finance-receipt-summary finance-quote-summary robotriq-accounts-summary">{totals.map(([label, value]) =>
                    <div key={label}><dt>{label}</dt><dd>{money.format(value)}</dd></div>)}</dl>}
                <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#e6e6e3] bg-white p-4 shadow-xs">
                    <div className="relative w-full sm:w-64">
                        <Search size={16} aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                        <input type="search" aria-label="Search ledger" placeholder="Search ledger" className={`${inputClass} w-full pl-9`} value={filters.search}
                            onChange={event => setFilters({ ...filters, search: event.target.value })} />
                    </div>
                    {[['from', 'From'], ['to', 'To']].map(([field, label]) => <label key={field} className="grid gap-1">{label}
                        <input type="date" className={inputClass} value={filters[field]}
                            onChange={event => setFilters({ ...filters, [field]: event.target.value })} />
                    </label>)}
                    {employee && !self && <label className="grid gap-1">Employee
                        <select className={inputClass} value={filters.employeeId} onChange={event => setFilters({ ...filters, employeeId: event.target.value })}>
                            <option value="">All employees</option>
                            {employeeOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
                        </select>
                    </label>}
                    {tab !== 'profit' && <button type="button" className={`${actionClass} sm:ml-auto`} disabled={!data || !!editor || busy}
                        onClick={() => open()}><Plus size={15} aria-hidden="true" />{expenseManagement ? 'Add expense or allocation' : employee ? 'Add expense' : 'Add transaction'}</button>}
                </div>
                {status && <p role="status">{status}</p>}
                {loading && <p role="status">Loading ledger…</p>}
                {editor && <form className="rounded-2xl border border-[#e6e6e3] bg-white p-4" onSubmit={event => {
                    event.preventDefault();
                    const values = Object.fromEntries(new FormData(event.currentTarget));
                    mutate(editor._id ? 'put' : 'post', editor._id ? `/${editor._id}` : '',
                        { ...values, amount: Number(values.amount) }, 'Entry saved.');
                }}>
                    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                        <legend className="font-semibold">{editor._id ? 'Edit entry' : 'New entry'}</legend>
                        {employee && !self && <label className="grid gap-1">Employee
                            <select className={inputClass} name="employeeId" required defaultValue={filters.employeeId}>
                                <option value="">Choose an employee</option>
                                {data.staff.map(row => <option key={row._id} value={row._id}>{row.name}</option>)}
                            </select>
                        </label>}
                        {!self && <label className="grid gap-1">Type
                            <select className={inputClass} name="type" defaultValue={editor.type}>
                                <option>Expense</option><option>{employee ? 'Allocation' : 'Income'}</option>
                            </select>
                        </label>}
                        <label className="grid gap-1">Date
                            <input className={inputClass} name="date" type="date" required defaultValue={editor.date} />
                        </label>
                        <label className="grid gap-1">Amount
                            <input className={inputClass} name="amount" type="number" min="0.01" step="any" required defaultValue={editor.amount} />
                        </label>
                        {!employee && <label className="grid gap-1">Status
                            <select className={inputClass} name="status" defaultValue={editor.status || 'Pending'}>
                                <option>Pending</option><option>Paid</option>
                            </select>
                        </label>}
                        <label className="grid gap-1 sm:col-span-2">Description
                            <textarea className={inputClass} name={description} maxLength={6000} required defaultValue={editor[description]} />
                        </label>
                        <div className="flex gap-2">
                            <button className={actionClass}>Save entry</button>
                            <button type="button" onClick={() => setEditor(null)}>Cancel</button>
                        </div>
                    </fieldset>
                </form>}
                {rows && tab === 'profit' && <Profit rows={rows} />}
                {tab !== 'profit' && rows?.length > 0 && <RobotriqPagedTable rows={rows}>{pageRows =>
                    <table className="w-full text-left text-sm">
                        <thead><tr>{['Date', ...(employee && !self ? ['Employee'] : []), 'Type', 'Description', 'Amount',
                            ...(employee ? ['Covered', 'Overdrawn', 'Wallet after'] : []), 'Status',
                            ...(!self ? ['Actions'] : [])].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
                        <tbody>{pageRows.map(row => <tr key={row._id} className="border-t">
                            <td className="p-3">{row.date}</td>
                            {employee && !self && <td className="p-3">{row.employeeName}</td>}
                            <td className="p-3">{receipt(row) ? 'Student receipt' : row.type || 'Expense'}</td>
                            <td className="p-3 break-words">{row[description]}</td>
                            <td className="p-3 whitespace-nowrap tabular-nums">{money.format(row.amount)}</td>
                            {employee && balances.timeline.get(row._id).map((value, index) =>
                                <td className="p-3 whitespace-nowrap tabular-nums" key={index}>{money.format(value)}</td>)}
                            <td className="p-3">{row.status || 'Pending'}</td>
                            {!self && <td className="space-x-2 whitespace-nowrap p-3">
                                {!employee && !receipt(row) && <button type="button" disabled={busy || !!editor} onClick={() => open(row)}>Edit</button>}
                                {employee && !expenseManagement && <button type="button" disabled={busy || !!editor} onClick={() => mutate('patch',
                                    `/${row._id}/status`, { status: row.status === 'Paid' ? 'Pending' : 'Paid' }, 'Status updated.')}>
                                    {row.status === 'Paid' ? 'Mark pending' : 'Mark paid'}</button>}
                                {!delegated && !receipt(row) && <button type="button" disabled={busy || !!editor} onClick={() => {
                                    if (window.confirm(employee ? 'Void this expense entry?' : 'Delete this entry?')) {
                                        mutate('delete', `/${row._id}`, undefined, employee ? 'Entry voided.' : 'Entry deleted.');
                                    }
                                }}>{employee ? 'Void' : 'Delete'}</button>}
                            </td>}
                        </tr>)}</tbody>
                    </table>
                }</RobotriqPagedTable>}
                {tab !== 'profit' && rows?.length === 0 && <p>No matching entries.</p>}
            </section>
        </div>
    );
    return expenseManagement || delegated ? content : <Layout workspace compactTools>{content}</Layout>;
}
