import './RobotriqWorkspace.css';
import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import API_BASE_URL from '../api';
import logo from '../assets/robotriq-receipt-logo.png';
import seal from '../assets/robotriq-receipt-seal.png';
import signature from '../assets/robotriq-receipt-sign.png';

const endpoint = `${API_BASE_URL}/api/robotriq/fee-receipts`;
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());
const modes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'NEFT'];
const input = 'robotriq-field';
const action = 'robotriq-primary';
const formatMoney = value => value == null ? '—' : currency.format(value);
const pdfMoney = value => value == null ? 'Unavailable' : `INR ${Number(value).toFixed(2)}`;

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function placeImage(doc, image, x, y, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    doc.addImage(image, 'PNG', x, y, image.naturalWidth * scale, image.naturalHeight * scale);
}

async function downloadReceipt(row) {
    const [logoImage, sealImage, signImage] = await Promise.all([logo, seal, signature].map(loadImage));
    const doc = new jsPDF();
    placeImage(doc, logoImage, 14, 12, 65, 20);
    doc.setFontSize(16);
    doc.text('Student Payment Receipt', 14, 44);
    autoTable(doc, {
        startY: 48, theme: 'grid', headStyles: { fillColor: [15, 118, 110] },
        head: [['Receipt detail', 'Value']],
        body: [
            ['Receipt number', row.number || 'Unavailable'], ['Date', row.date], ['Order ID', row.orderId],
            ['Student', row.studentName], ['Course', row.course], ['Address', row.address],
            ['Payment mode', row.paymentMode], ['Transaction reference', row.reference], ['Total fees', pdfMoney(row.totalFees)],
            ['Previously paid', pdfMoney(row.previouslyPaid)], ['Amount received', pdfMoney(row.amount)],
            ['Balance', pdfMoney(row.balance)], ['Next due date', row.nextDueDate]
        ].filter(([, value]) => value)
    });
    let y = doc.lastAutoTable.finalY + 8;
    if (y > 249) { doc.addPage(); y = 16; }
    placeImage(doc, sealImage, 135, y, 26, 24);
    placeImage(doc, signImage, 167, y, 29, 20);
    doc.setFontSize(9);
    doc.text('Authorised signatory', 166, y + 24);
    doc.save(`Receipt_${(row.number || row._id).replace(/[^A-Za-z0-9-]/g, '-')}.pdf`);
}

export default function RobotriqFeeReceipts({ delegated = false }) {
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [search, setSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
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
        setStudentSearch('');
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
    const studentQuery = studentSearch.trim().toLowerCase();
    const rows = data?.receipts.filter(row => [row.studentName, row.number, row.orderId]
        .some(value => (value || '').toLowerCase().includes(query)));
    const options = data?.students.filter(student => student._id === editor?.studentId ||
        (student.orderId && [student.fullName, student.studentId, student.orderId]
            .some(value => (value || '').toLowerCase().includes(studentQuery))));
    const student = data?.students.find(row => row._id === editor?.studentId);

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search receipt history
                <input className={input} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button className={action} type="button" disabled={!data || !!editor || busy} onClick={() => open()}>New student receipt</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {!data && !error && <p role="status">Loading student receipts…</p>}
        {editor && <form className="robotriq-panel" onSubmit={event => {
            event.preventDefault();
            update(editor._id ? 'put' : 'post', editor);
        }}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <legend className="font-semibold">{editor._id ? 'Edit student receipt' : 'New student receipt'}</legend>
                {!editor._id && <label className="grid gap-1">Find by student or order ID
                    <input className={input} value={studentSearch} onChange={event => setStudentSearch(event.target.value)} />
                </label>}
                <label className="grid gap-1">Student
                    <select className={input} required value={editor.studentId} disabled={!!editor._id}
                        onChange={event => setEditor({ ...editor, studentId: event.target.value })}>
                        <option value="">Select a student</option>
                        {options?.map(row => <option key={row._id} value={row._id}>{row.fullName} · {row.orderId}</option>)}
                    </select>
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
