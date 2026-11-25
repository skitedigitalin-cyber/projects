import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';
import { topImage, bottomImage, sealImage } from '../assets/minePowerQuotationImages';
import { signImage } from '../assets/robotriqImages';
import defaults from '../utils/minePowerQuoteDefaults';
import { generateLetterheadQuotePdf } from '../utils/letterheadQuotePdfGenerator';

const endpoint = `${API_BASE_URL}/api/robotriq/sales-quotes`;
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const dateInIndia = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(value);
const emptyLine = () => ({ item: '', qty: 1, salePrice: 0 });
const fields = [
    ['reference', 'Company'], ['customerName', 'Customer'], ['application', 'Application'], ['phone', 'Phone'],
    ['specNote', 'Specification note'], ['transportLabel', 'Transport label'], ['validityLabel', 'Validity label'],
    ['netAmountLabel', 'Total label'], ['bankName', 'Bank account name'], ['branch', 'Branch'],
    ['bobAc', 'Account number'], ['ifsc', 'IFSC'], ['sigThanks', 'Closing'], ['sigFor', 'Signed for'], ['sigName', 'Signatory']
];
const branding = {
    quotationHeaderImage: topImage, quotationFooterImage: bottomImage, quotationSeal: sealImage, quotationSign: signImage
};

function savedDate(quote) {
    const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(quote.customData?.date || '');
    return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : quote.date?.slice(0, 10);
}

function totals(quote) {
    const subtotal = quote.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.salePrice), 0);
    const transport = quote.transportOverride === '' ? subtotal * Number(quote.transportPercent) / 100 : Number(quote.transportOverride);
    const gst = (subtotal + transport) * Number(quote.gstPercent) / 100;
    return [['Subtotal', subtotal], ['Transport', transport], ['GST', gst], ['Total', subtotal + transport + gst]];
}

export default function RobotriqSalesQuotes({ canDelete }) {
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const leads = useMemo(() => new Map(data?.leads.map(row => [row._id, row])), [data]);
    const items = useMemo(() => new Map(data?.items.map(row => [row._id, row])), [data]);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(response => setData(response.data)).catch(() => {
            if (!controller.signal.aborted) setError('Could not load Mine Power quotations.');
        });
        return () => controller.abort();
    }, []);

    function open(quote) {
        setError('');
        setEditor(quote ? {
            ...quote, date: savedDate(quote), customData: { ...defaults, ...quote.customData },
            transportOverride: quote.customData?.transportOverride === null
                ? '' : quote.customData?.transportOverride ?? quote.transportAmount ?? ''
        } : {
            lead: '', date: dateInIndia(new Date()), items: [emptyLine()], transportPercent: 5,
            transportOverride: '', gstPercent: 18, validityDays: 15, customData: { ...defaults }
        });
    }

    function updateItem(index, changes) {
        setEditor(current => ({ ...current, items: current.items.map((row, i) => i === index ? { ...row, ...changes } : row) }));
    }

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        const payload = {
            lead: editor.lead, date: editor.date, items: editor.items.map(row => ({
                item: row.item, qty: Number(row.qty), salePrice: Number(row.salePrice)
            })),
            transportPercent: Number(editor.transportPercent), gstPercent: Number(editor.gstPercent),
            transportOverride: editor.transportOverride === '' ? null : Number(editor.transportOverride),
            validityDays: Number(editor.validityDays), customData: editor.customData
        };
        try {
            const { data: saved } = editor._id
                ? await axios.put(`${endpoint}/${editor._id}`, payload)
                : await axios.post(endpoint, payload);
            setData(current => ({ ...current, quotes: editor._id
                ? current.quotes.map(row => row._id === saved._id ? saved : row)
                : [saved, ...current.quotes] }));
            setEditor(null);
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not save the quotation.');
        } finally {
            setBusy(false);
        }
    }

    async function remove(quote) {
        if (!window.confirm(`Delete quotation ${quote.quotationNo}?`)) return;
        setBusy(true);
        setError('');
        try {
            await axios.delete(`${endpoint}/${quote._id}`);
            setData(current => ({ ...current, quotes: current.quotes.filter(row => row._id !== quote._id) }));
        } catch {
            setError('Could not delete the quotation.');
        } finally {
            setBusy(false);
        }
    }

    async function download(quote) {
        const lead = leads.get(quote.lead);
        const custom = quote.customData || {};
        const pdfItems = quote.items.map((row, index) => {
            const item = items.get(row.item);
            const old = custom.items?.find(line => line.item === row.item);
            return {
                componentText: old?.componentText || [item?.componentName || 'Item unavailable', item?.description].filter(Boolean).join('\n'),
                make: old?.make || item?.brand, specifics: old?.specifics || item?.specification,
                qty: row.qty, sno: index + 1, price: Number(row.salePrice).toFixed(2), amountStr: Number(row.amount).toFixed(2)
            };
        });
        await generateLetterheadQuotePdf({
            ...defaults, customerName: lead?.customerName, reference: lead?.companyName || lead?.reference, phone: lead?.phone,
            ...custom, date: custom.date || savedDate(quote), quotationNo: quote.quotationNo, items: pdfItems,
            totalAmountStr: Number(quote.totalAmount).toFixed(2), transportAmountStr: Number(quote.transportAmount).toFixed(2),
            gstLabel: `GST ${quote.gstPercent}%`, gstAmountStr: Number(quote.gstAmount).toFixed(2),
            netAmountStr: Number(quote.netAmount).toFixed(2), validityDays: quote.validityDays
        }, branding);
    }

    const query = search.trim().toLowerCase();
    const visible = data?.quotes.filter(quote => !query || [quote.quotationNo, quote.customData?.customerName,
        leads.get(quote.lead)?.customerName, leads.get(quote.lead)?.enquiryId].some(value => value?.toLowerCase().includes(query)));

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search quotations
                <input className="rounded border bg-white p-2" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button className="rounded bg-slate-900 px-3 py-2 text-white" type="button"
                disabled={busy || !!editor || !data?.leads.length || !data?.items.length} onClick={() => open()}>New quotation</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p role="status">Loading quotations…</p>}
        {editor && <form className="rounded border bg-white p-4" onSubmit={save}>
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">Sales lead
                    <select className="rounded border p-2" required value={editor.lead} onChange={event => {
                        const lead = leads.get(event.target.value);
                        setEditor(current => ({ ...current, lead: event.target.value, customData: {
                            ...current.customData, customerName: lead?.customerName || '',
                            reference: lead?.companyName || lead?.reference || '', phone: lead?.phone || '', application: ''
                        } }));
                    }}>
                        <option value="">Select a sales lead</option>
                        {data.leads.map(lead => <option key={lead._id} value={lead._id}>{lead.enquiryId} · {lead.customerName}</option>)}
                    </select>
                </label>
                <label className="grid gap-1">Quotation date
                    <input className="rounded border p-2" type="date" required value={editor.date}
                        onChange={event => setEditor({ ...editor, date: event.target.value })} />
                </label>
                {fields.slice(0, 4).map(([field, label]) => <label key={field} className="grid gap-1">{label}
                    <input className="rounded border p-2" value={editor.customData[field] || ''}
                        onChange={event => setEditor({ ...editor, customData: { ...editor.customData, [field]: event.target.value } })} />
                </label>)}
                {editor.items.map((row, i) => <fieldset key={i} className="grid gap-3 rounded border p-3 sm:col-span-2 sm:grid-cols-4">
                    <legend>Item {i + 1}</legend>
                    <label className="grid gap-1">Component
                        <select className="rounded border p-2" required value={row.item} onChange={event =>
                            updateItem(i, { item: event.target.value, salePrice: items.get(event.target.value)?.salePrice ?? 0 })}>
                            <option value="">Select a component</option>
                            {data.items.map(item => <option key={item._id} value={item._id}>{item.componentName}</option>)}
                        </select>
                    </label>
                    {[['qty', 'Quantity'], ['salePrice', 'Sale price']].map(([field, label]) =>
                        <label key={field} className="grid gap-1">{label}
                            <input className="rounded border p-2" type="number" min={field === 'qty' ? 1 : 0}
                                step={field === 'qty' ? 1 : 'any'} required value={row[field]}
                                onChange={event => updateItem(i, { [field]: event.target.value })} />
                        </label>)}
                    <button type="button" disabled={editor.items.length === 1} onClick={() => setEditor(current => ({
                        ...current, items: current.items.filter((_, index) => index !== i)
                    }))}>Remove item</button>
                </fieldset>)}
                <button className="justify-self-start rounded border px-3 py-2 sm:col-span-2" type="button" onClick={() => setEditor(current => ({
                    ...current, items: [...current.items, emptyLine()]
                }))}>Add item line</button>
                {[['transportPercent', 'Transport %'], ['transportOverride', 'Fixed transport amount'], ['gstPercent', 'GST %'],
                    ['validityDays', 'Validity in days']].map(([field, label]) => <label key={field} className="grid gap-1">{label}
                    <input className="rounded border p-2" type="number" min={field === 'validityDays' ? 1 : 0}
                        step={field === 'validityDays' ? 1 : 'any'} required={field !== 'transportOverride'} value={editor[field]}
                        onChange={event => setEditor({ ...editor, [field]: event.target.value })} />
                </label>)}
                <details className="sm:col-span-2">
                    <summary className="cursor-pointer">PDF details and terms</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {fields.slice(4).map(([field, label]) => <label key={field} className="grid gap-1">{label}
                            <input className="rounded border p-2" value={editor.customData[field] || ''} onChange={event =>
                                setEditor({ ...editor, customData: { ...editor.customData, [field]: event.target.value } })} />
                        </label>)}
                        {editor.customData.terms?.map((term, index) => <fieldset key={index} className="grid gap-2 rounded border p-2">
                            <legend>Term {index + 1}</legend>
                            {[['title', 'Title'], ['desc', 'Description']].map(([field, label]) =>
                                <label key={field} className="grid gap-1">{label}
                                    <textarea className="rounded border p-2" value={term[field] || ''} onChange={event => {
                                        const value = event.target.value;
                                        setEditor(current => ({ ...current, customData: { ...current.customData,
                                            terms: current.customData.terms.map((row, i) => i === index ? { ...row, [field]: value } : row)
                                        } }));
                                    }} />
                                </label>)}
                        </fieldset>)}
                    </div>
                </details>
                <dl className="grid gap-2 sm:col-span-2 sm:grid-cols-4">{totals(editor).map(([label, value]) =>
                    <div key={label}><dt>{label}</dt><dd className="font-semibold">{currency.format(value)}</dd></div>)}</dl>
                <div className="flex gap-2">
                    <button className="rounded bg-slate-900 px-3 py-2 text-white">Save quotation</button>
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </fieldset>
        </form>}
        {visible?.length > 0 && <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-left text-sm">
                <thead><tr>{['Quotation', 'Enquiry', 'Customer', 'Total', 'Actions'].map(label =>
                    <th key={label} className="p-3">{label}</th>)}</tr></thead>
                <tbody>{visible.map(quote => <tr className="border-t" key={quote._id}>
                    <td className="p-3">{quote.quotationNo}</td>
                    <td className="p-3">{leads.get(quote.lead)?.enquiryId || '—'}</td>
                    <td className="p-3">{quote.customData?.customerName || leads.get(quote.lead)?.customerName || '—'}</td>
                    <td className="p-3">{currency.format(quote.netAmount || 0)}</td>
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" disabled={busy || !!editor} onClick={() => open(quote)}>Edit</button>
                        <button type="button" onClick={() => download(quote)}>Download PDF</button>
                        {canDelete && <button type="button" disabled={busy || !!editor} onClick={() => remove(quote)}>Delete</button>}
                    </td>
                </tr>)}</tbody>
            </table>
        </div>}
        {visible?.length === 0 && <p>No matching quotations.</p>}
    </section>;
}
