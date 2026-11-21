import { useRef, useState } from 'react';
import axios from 'axios';
import { reminderGroup } from '../utils/salesPipeline';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { Bell, Clock, Download, Plus, Upload } from 'lucide-react';

const button = 'inline-flex items-center gap-2 rounded-xl border border-[#e6e6e3] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f5f5f3] disabled:opacity-50';
const input = 'block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';

export default function SalesChannelOverview({ source, leads, services, defaultService, onChange }) {
    const fileInput = useRef(null);
    const [form, setForm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [failed, setFailed] = useState(false);

    const label = source.replace(/ Leads$/, '');
    const fields = [
        ['date', 'Date', 'date'], ['companyName', 'Company', 'text'],
        ['customerName', 'Client name', 'text'], ['mobileNumber', 'Phone', 'tel'],
        ['whatsappNumber', 'WhatsApp', 'tel'], ['serviceType', 'Service type', 'select'],
        ['location', 'Location', 'text'], ['industry', 'Business', 'text'], ['email', 'Email', 'email'],
    ];

    const create = record => axios.post('/api/leads', {
        ...record,
        leadSource: source,
        leadStatus: 'New',
        leadStage: 'Lead',
        callStatus: 'Lead',
        productServiceInterested: record.serviceType,
    });

    const run = async action => {
        setBusy(true);
        setFeedback('');
        setFailed(false);
        try {
            await action();
        } catch (error) {
            setFailed(true);
            setFeedback(error.response?.data?.message || error.message || 'The action could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const save = event => {
        event.preventDefault();
        run(async () => {
            const customerName = form.customerName?.trim();
            if (!customerName) throw new Error('Enter a client name.');
            const { data } = await create({ ...form, customerName });
            onChange([data]);
            setForm(null);
        });
    };

    const importWorkbook = event => {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        run(async () => {
            const { read, utils, SSF } = await import('xlsx');
            const workbook = read(await file.arrayBuffer());
            const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            const key = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const header = rows.findIndex(row => row.some(cell =>
                ['name', 'clientname', 'customername', 'phone', 'phonenumber', 'mobile'].includes(key(cell))));
            if (header < 0) throw new Error('The workbook needs a client name or phone column.');
            const columns = rows[header].map(key);
            const imported = [];
            try {
                for (const row of rows.slice(header + 1)) {
                    const values = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
                    const get = (...keys) => String(keys.map(name => values[name]).find(value => value != null && value !== '') ?? '').trim();
                    const customerName = get('name', 'clientname', 'customername');
                    const mobileNumber = get('phone', 'phonenumber', 'mobile', 'mobilenumber');
                    if (!customerName && !mobileNumber) continue;
                    const rawService = get('service', 'servicetype');
                    const matched = services.find(service => service.toLowerCase() === rawService.toLowerCase());
                    const serviceType = matched
                        || (/web/i.test(rawService) ? 'Web Development' : /ads|paid/i.test(rawService) ? 'Paid Campaigns'
                            : /seo/i.test(rawService) ? 'SEO' : /branding/i.test(rawService) ? 'Personal Branding' : rawService)
                        || defaultService;
                    const date = typeof values.date === 'number' ? SSF.format('yyyy-mm-dd', values.date)
                        : get('date').replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (_, day, month, year) =>
                            [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-'));
                    const { data } = await create({
                        customerName: customerName || 'Unknown', mobileNumber, serviceType, date,
                        companyName: get('company', 'companyname'), email: get('email', 'emailid'),
                        whatsappNumber: get('whatsapp', 'whatsappnumber'), location: get('location', 'city'),
                        industry: get('business', 'businesstype', 'industry'),
                    });
                    imported.push(data);
                }
            } catch (error) {
                throw new Error(`Imported ${imported.length} leads before a row failed. ${error.response?.data?.message || error.message}`);
            } finally {
                if (imported.length) onChange(imported);
            }
            if (!imported.length) throw new Error('The workbook contains no lead rows.');
            setFeedback(`Imported ${imported.length} leads into ${source}.`);
        });
    };

    const download = () => run(async () => {
        const doc = new jsPDF();
        doc.text(source, 14, 18);
        autoTable(doc, {
            startY: 24,
            head: [['Date', 'Name', 'Company', 'Phone', 'Service', 'Status']],
            body: leads.map(lead => [lead.date || lead.createdAt?.slice(0, 10), lead.customerName,
                lead.companyName, lead.mobileNumber, lead.serviceType || lead.productServiceInterested,
                lead.callStatus === 'Rejected' || ['New', 'Contacted'].includes(lead.leadStatus)
                    ? lead.callStatus || lead.leadStatus : lead.leadStatus]),
        });
        doc.save(label.toLowerCase() + '-leads.pdf');
    });

    return <>
        <p className="mb-4 text-sm text-slate-500">Excel imports go into the {label} pipeline.</p>
        <div className="mb-5 flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy} onClick={download}><Download size={16} /> Download PDF</button>
            <button type="button" className={button} disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={16} /> Import Excel</button>
            <input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={importWorkbook} />
            <button type="button" className={button} disabled={busy} onClick={() => {
                setFeedback('');
                setForm({ serviceType: defaultService });
            }}><Plus size={16} /> New {label} Lead</button>
        </div>
        {feedback && !form && <p role={failed ? 'alert' : 'status'} className="mb-4 text-sm">{feedback}</p>}
        {form && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <form role="dialog" aria-modal="true" aria-labelledby="channel-lead-title"
                className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onSubmit={save}>
                <h3 id="channel-lead-title" className="mb-5 text-xl font-bold">Add {label} Lead</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fields.map(([name, title, type]) => <label key={name} className="text-sm font-semibold">
                        {title}
                        {type === 'select' ? <select className={input} value={form[name]} required
                            onChange={event => setForm({ ...form, [name]: event.target.value })}>
                            {services.map(service => <option key={service}>{service}</option>)}
                        </select> : <input className={input} type={type} value={form[name] || ''}
                            required={name === 'customerName'}
                            onChange={event => setForm({ ...form, [name]: event.target.value })} />}
                    </label>)}
                </div>
                {feedback && <p className="mt-4 text-sm text-red-700" role="alert">{feedback}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className={button} disabled={busy} onClick={() => setForm(null)}>Cancel</button>
                    <button className={button} disabled={busy}>{busy ? 'Saving…' : 'Save Record'}</button>
                </div>
            </form>
        </div>}
    </>;
}

export function SalesChannelMetrics({ leads, onOpen }) {
    const now = new Date();
    const closed = leads.filter(lead => lead.leadStatus === 'Converted').length;
    return <div className="mb-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
            <div className={button}>Goals <strong>{closed} / 50</strong></div>
            <button className={button} onClick={() => onOpen('all')}>Total leads <strong>{leads.length}</strong></button>
            <div className={button}>Closure rate <strong>{leads.length ? Math.round(closed / leads.length * 100) : 0}%</strong></div>
        </div>
        <h3 className="font-bold">Reminders</h3>
        <div className="grid gap-3 sm:grid-cols-2">
            {[['today', 'Scheduled follow-ups', Bell], ['missed', 'Missed follow-ups', Clock]].map(([group, text, Icon]) =>
                <button key={group} className={button} onClick={() => onOpen(group)}>
                    <Icon size={16} /> {text} <strong>{leads.filter(lead => reminderGroup(lead, now) === group).length}</strong>
                </button>)}
        </div>
    </div>;
}
