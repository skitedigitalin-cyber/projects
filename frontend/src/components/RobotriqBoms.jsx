import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/boms`;
const emptyLine = () => ({ item: '', qty: 1, purchasePrice: 0, salePrice: 0 });
const rates = [['qty', 'Quantity'], ['purchasePrice', 'Purchase price'], ['salePrice', 'Sale price']];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function summarize(items) {
    const purchase = items.reduce((sum, row) => sum + row.qty * row.purchasePrice, 0);
    const sale = items.reduce((sum, row) => sum + row.qty * row.salePrice, 0);
    return [['Purchase total', purchase], ['Sale total', sale], ['Net profit', sale - purchase]];
}

export default function RobotriqBoms({ canDelete }) {
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [message, setMessage] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const leads = useMemo(() => new Map(data?.leads.map(lead => [lead._id, lead])), [data]);
    const items = useMemo(() => new Map(data?.items.map(item => [item._id, item])), [data]);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(response => setData(response.data)).catch(() => {
            if (!controller.signal.aborted) setLoadFailed(true);
        });
        return () => controller.abort();
    }, []);

    function updateLine(index, changes) {
        setEditor(current => ({
            ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line)
        }));
    }

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            const payload = { lead: editor.lead, items: editor.items.map(row => ({
                item: row.item, qty: Number(row.qty), purchasePrice: Number(row.purchasePrice), salePrice: Number(row.salePrice)
            })) };
            const { data: saved } = editor._id
                ? await axios.put(`${endpoint}/${editor._id}`, payload)
                : await axios.post(endpoint, payload);
            setData(current => ({ ...current, boms: editor._id
                ? current.boms.map(bom => bom._id === saved._id ? saved : bom)
                : [saved, ...current.boms] }));
            setEditor(null);
            setMessage('BOM saved.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not save the BOM.');
        } finally {
            setBusy(false);
        }
    }

    async function remove(bom) {
        if (!window.confirm('Delete this BOM?')) return;
        setBusy(true);
        setMessage('');
        try {
            await axios.delete(`${endpoint}/${bom._id}`);
            setData(current => ({ ...current, boms: current.boms.filter(row => row._id !== bom._id) }));
            setMessage('BOM deleted.');
        } catch {
            setMessage('Could not delete the BOM.');
        } finally {
            setBusy(false);
        }
    }

    function download(bom) {
        try {
            const doc = new jsPDF();
            const lead = leads.get(bom.lead);
            doc.text('Bill of Materials', 14, 20);
            doc.setFontSize(11);
            doc.text([lead?.enquiryId, lead?.customerName].filter(Boolean).join(' - ') || 'Sales lead unavailable', 14, 30);
            autoTable(doc, {
                startY: 36,
                head: [['Component', 'Quantity', 'Purchase price', 'Sale price']],
                body: bom.items.map(row => [items.get(row.item)?.componentName || 'Item unavailable', row.qty,
                    Number(row.purchasePrice).toFixed(2), Number(row.salePrice).toFixed(2)])
            });
            autoTable(doc, {
                body: [['Purchase total', bom.totalPurchaseAmount], ['Sale total', bom.totalSaleAmount], ['Net profit', bom.netProfit]]
                    .map(([label, value]) => [label, `INR ${Number(value).toFixed(2)}`])
            });
            doc.save(`BOM-${lead?.enquiryId || bom._id}.pdf`);
        } catch {
            setMessage('Could not generate the BOM PDF.');
        }
    }

    if (loadFailed) return <p role="alert">Could not load bills of materials.</p>;
    if (!data) return <p role="status">Loading bills of materials…</p>;

    const query = search.trim().toLowerCase();
    const visible = data.boms.filter(bom => {
        const lead = leads.get(bom.lead);
        return !query || [lead?.enquiryId, lead?.customerName].some(value => value?.toLowerCase().includes(query));
    });

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search by enquiry or customer
                <input className="rounded border bg-white px-3 py-2" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button type="button" className="rounded bg-slate-900 px-3 py-2 text-white"
                disabled={!!editor || busy || !data.leads.length || !data.items.length}
                onClick={() => setEditor({ lead: '', items: [emptyLine()] })}>Create BOM</button>
        </div>
        {(!data.leads.length || !data.items.length) && <p>Creating a BOM requires a Mine Power sales lead and a catalog item.</p>}
        {message && <p role="status">{message}</p>}
        {editor && <form className="grid gap-3 rounded border bg-white p-4" onSubmit={save}>
            <h2 className="font-semibold">{editor._id ? 'Edit BOM' : 'New BOM'}</h2>
            <fieldset className="grid gap-3" disabled={busy}>
                <label className="grid gap-1">Sales lead
                    <select className="rounded border p-2" required value={editor.lead}
                        onChange={event => setEditor({ ...editor, lead: event.target.value })}>
                        <option value="">Select a sales lead</option>
                        {data.leads.map(lead => <option key={lead._id} value={lead._id}>{lead.enquiryId} · {lead.customerName}</option>)}
                    </select>
                </label>
                {editor.items.map((row, index) => <fieldset className="grid gap-3 rounded border p-3 sm:grid-cols-4" key={index}>
                    <legend>Item {index + 1}</legend>
                    <label className="grid gap-1 sm:col-span-4">Component
                        <select className="rounded border p-2" required value={row.item} onChange={event => {
                            const item = items.get(event.target.value);
                            updateLine(index, { item: event.target.value, purchasePrice: item?.purchasePrice ?? 0, salePrice: item?.salePrice ?? 0 });
                        }}>
                            <option value="">Select a component</option>
                            {data.items.map(item => <option key={item._id} value={item._id}>{item.componentName}</option>)}
                        </select>
                    </label>
                    {rates.map(([field, label]) => <label className="grid gap-1" key={field}>{label}
                        <input type="number" className="rounded border p-2" value={row[field]} step="any"
                            min={field === 'qty' ? 0.000001 : 0} required
                            onChange={event => updateLine(index, { [field]: event.target.value })} />
                    </label>)}
                    <button type="button" disabled={editor.items.length === 1} onClick={() => setEditor(current => ({
                        ...current, items: current.items.filter((_, lineIndex) => lineIndex !== index)
                    }))}>Remove item</button>
                </fieldset>)}
                <button type="button" className="justify-self-start rounded border px-3 py-2" onClick={() => setEditor(current => ({
                    ...current, items: [...current.items, emptyLine()]
                }))}>Add item line</button>
                <dl className="grid gap-2 sm:grid-cols-3">{summarize(editor.items).map(([label, value]) =>
                    <div key={label}><dt>{label}</dt><dd className="font-semibold">{currency.format(value)}</dd></div>)}</dl>
                <div className="flex gap-2">
                    <button className="rounded bg-slate-900 px-3 py-2 text-white">Save BOM</button>
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </fieldset>
        </form>}
        {visible.length ? <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-left text-sm">
                <thead><tr>{['Enquiry', 'Customer', 'Purchase total', 'Sale total', 'Net profit', 'Actions'].map(label =>
                    <th key={label} className="p-3">{label}</th>)}</tr></thead>
                <tbody>{visible.map(bom => <tr key={bom._id} className="border-t">
                    <td className="p-3">{leads.get(bom.lead)?.enquiryId || '—'}</td>
                    <td className="p-3">{leads.get(bom.lead)?.customerName || '—'}</td>
                    {[bom.totalPurchaseAmount, bom.totalSaleAmount, bom.netProfit].map((value, index) =>
                        <td key={index} className="p-3">{currency.format(value || 0)}</td>)}
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" disabled={busy || !!editor} onClick={() => setEditor(bom)}>Edit</button>
                        <button type="button" onClick={() => download(bom)}>Download PDF</button>
                        {canDelete && <button type="button" disabled={busy || !!editor} onClick={() => remove(bom)}>Delete</button>}
                    </td>
                </tr>)}</tbody>
            </table>
        </div> : <p>No matching bills of materials.</p>}
    </section>;
}
