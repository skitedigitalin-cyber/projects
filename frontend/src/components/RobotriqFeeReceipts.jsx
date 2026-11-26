import { robotriqReceiptPdf } from '../utils/robotriqReceiptPdf';
import './RobotriqWorkspace.css';
import SearchPicker from './SearchPicker';
import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/fee-receipts`;
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());
const modes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'NEFT'];
const input = 'robotriq-field';
const action = 'robotriq-primary';
const formatMoney = value => value == null ? '—' : currency.format(value);

async function downloadReceipt(row) {
    const doc = await robotriqReceiptPdf(row);
    doc.save(`Receipt_${(row.number || row._id).replace(/[^A-Za-z0-9-]/g, '-')}.pdf`);
}

export default function RobotriqFeeReceipts({ delegated = false }) {
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => setData(result)).catch(() => {
            if (!controller.signal.aborted) setError('Could not load student receipts.');
        });
        return () => controller.abort();
    }, []);

    function open(row) {
        setError('');
        setMessage('');
        setEditor(row || { number: data.nextNumber, studentId: '', date: today(), paymentMode: 'Bank Transfer',
            amount: '', reference: '', nextDueDate: '' });
    }

    async function update(method, row) {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await axios({ url: row._id ? `${endpoint}/${row._id}` : endpoint, method,
                data: method === 'delete' ? { updatedAt: row.updatedAt } : { ...row, amount: Number(row.amount) } });
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not update the receipt.');
            setBusy(false);
            return;
        }
        setEditor(null);
        setMessage(method === 'delete' ? 'Receipt deleted and student balance updated.' : 'Receipt saved and student balance updated.');
        try {
            const { data: refreshed } = await axios.get(endpoint);
            setData(refreshed);
        } catch {
            setData(null);
            setError('The change was saved. Reload this page to refresh the receipt list.');
        } finally {
            setBusy(false);
        }
    }

    const query = search.trim().toLowerCase();
    const rows = data?.receipts.filter(row => [row.studentName, row.number, row.orderId]
        .some(value => (value || '').toLowerCase().includes(query)));
    const options = data?.students.filter(student => student.orderId?.trim()).map(student => ({
        id: student._id, label: student.fullName, detail: student.orderId,
        searchText: [student.fullName, student.studentId, student.orderId].join(' ').toLowerCase()
    }));
    const student = data?.students.find(row => row._id === editor?.studentId);

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search receipt history
                <input className={input} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button className={action} type="button" disabled={!data || !!editor || busy} onClick={() => open()}>Student Order ID</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {!data && !error && <p role="status">Loading student receipts…</p>}
        {editor && <form className="robotriq-panel" onSubmit={event => {
            event.preventDefault();
            if (editor.studentId) update(editor._id ? 'put' : 'post', editor);
            else setError('Select a student before saving the receipt.');
        }}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <legend className="font-semibold">{editor._id ? 'Edit student receipt' : 'Student Order ID'}</legend>
                {editor._id ? <label className="grid gap-1">Student
                    <input className={input} value={editor.studentName || student?.fullName || ''} readOnly />
                </label> : <SearchPicker label="Student" placeholder="Search by name, student ID, or order ID"
                    options={options} selectedLabel={student?.fullName}
                    onSelect={studentId => setEditor(current => ({ ...current, studentId }))} />}
                <label className="grid gap-1">Student Order ID
                    <input className={input} value={(editor._id ? editor.orderId : student?.orderId) || ''}
                        placeholder="Select a student" readOnly />
                </label>
                {student && <p className="sm:col-span-2">
                    {student.course} · Total fees {formatMoney(student.fees)} · Paid {formatMoney(student.paidAmount)} · Balance {formatMoney(student.pendingAmount)}
                </p>}
                {[['number', 'Receipt number'], ['date', 'Receipt date', 'date'], ['amount', 'Amount received', 'number'],
                    ['reference', 'Transaction reference'], ['nextDueDate', 'Next due date', 'date']].map(([field, label, type]) =>
                    <label key={field} className="grid gap-1">{label}
                        <input className={input} type={type || 'text'} value={editor[field] || ''}
                            required={['number', 'date', 'amount'].includes(field)} min={field === 'amount' ? '0.01' : undefined}
                            step={field === 'amount' ? '0.01' : undefined}
                            onChange={event => setEditor({ ...editor, [field]: event.target.value })} />
                    </label>)}
                <label className="grid gap-1">Payment mode
                    <select className={input} value={editor.paymentMode} onChange={event => setEditor({ ...editor, paymentMode: event.target.value })}>
                        {modes.map(mode => <option key={mode}>{mode}</option>)}
                    </select>
                </label>
                <div className="flex gap-3">
                    <button className={action}>Save receipt</button>
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </fieldset>
        </form>}
        {rows?.length > 0 && <RobotriqPagedTable rows={rows}>{pageRows =>
<table className="w-full text-left text-sm">
                <thead><tr>{['Date', 'Receipt', 'Student', 'Order', 'Amount', 'Balance', 'Actions'].map(label =>
                    <th className="p-3" key={label}>{label}</th>)}</tr></thead>
                <tbody>{pageRows.map(row => <tr key={row._id} className="border-t">
                    {[row.date, row.number, row.studentName, row.orderId, formatMoney(row.amount), formatMoney(row.balance)]
                        .map((value, index) => <td className="p-3" key={index}>{value || '—'}</td>)}
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" onClick={() => downloadReceipt(row).catch(() => setError('Could not generate the receipt PDF.'))}>Download PDF</button>
                        {row.historical ? <span>{row.studentId ? 'Legacy record' : 'Legacy record · Student link unavailable'}</span> : <>
                            <button type="button" disabled={busy || !!editor} onClick={() => open(row)}>Edit</button>
                            {!delegated && <button type="button" disabled={busy || !!editor} onClick={() => {
                                if (window.confirm('Delete this receipt and reverse its amount from the student balance?')) update('delete', row);
                            }}>Delete</button>}
                        </>}
                    </td>
                </tr>)}</tbody>
            </table>
}</RobotriqPagedTable>}
        {rows?.length === 0 && <p>No matching student receipts.</p>}
    </section>;
}
