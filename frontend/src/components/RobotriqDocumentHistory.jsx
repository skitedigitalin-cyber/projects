import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';
import { quotationAssets } from '../utils/quotationBranding';
import { generateLetterheadQuotePdf } from '../utils/letterheadQuotePdfGenerator';

const endpoint = `${API_BASE_URL}/api/robotriq/document-history`;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const reportFields = [
    ['customer', 'Customer'], ['dateOfService', 'Date of service'], ['status', 'Status'], ['workAuthNo', 'Work authorisation'],
    ['engineerName', 'Engineer'], ['callByAndDate', 'Call details'], ['locationAddress', 'Site address'],
    ['machineName', 'Machine'], ['equipmentServiced', 'Equipment serviced'], ['typeOfServicePerformed', 'Service performed'],
    ['additionalServicePerformed', 'Additional services'], ['totalDaysOfService', 'Days of service'],
    ['totalServiceHours', 'Service hours'], ['travelMiles', 'Travel miles'], ['plcDetails', 'PLC details'], ['hmiDetails', 'HMI details'],
    ['partsRepairedOrReplaced', 'Parts repaired or replaced'], ['rootCauseRecommendations', 'Root cause and recommendations'],
    ['customerComments', 'Customer comments']
];
const sections = [
    ['customerRep', 'Customer representative'], ['minePowerRep', 'Mine Power representative'], ['serviceTypes', 'Service types'],
    ['serviceLogs', 'Service log'], ['travelLogs', 'Travel log']
];

function details(value) {
    if (Array.isArray(value)) return value.length ? <ul className="space-y-2">{value.map((item, i) =>
        <li key={i} className="rounded border p-2">{details(item)}</li>
    )}</ul> : '—';
    if (value && typeof value === 'object') return <dl className="grid gap-2 sm:grid-cols-2">
        {Object.entries(value).filter(([key]) => key !== '_id').map(([key, item]) => <div key={key}>
            <dt className="text-slate-600">{key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase())}</dt>
            <dd>{details(item)}</dd>
        </div>)}
    </dl>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value || value === 0 ? String(value) : '—';
}

export default function RobotriqDocumentHistory({ service = false }) {
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${endpoint}/${service ? 'service-reports' : 'admin-quotes'}`, { signal: controller.signal })
            .then(({ data: result }) => { if (!controller.signal.aborted) setData(result); })
            .catch(() => { if (!controller.signal.aborted) setError('Could not load the document history.'); });
        return () => controller.abort();
    }, [service]);

    async function download(row) {
        setError('');
        const custom = row.customData || {};
        const catalog = new Map(data.items.map(item => [item._id, item]));
        const items = (row.items || []).map((line, i) => {
            const snapshot = Array.isArray(custom.items) ? custom.items[i] : null;
            const item = catalog.get(line.item);
            return { ...snapshot, sno: i + 1, qty: line.qty,
                componentText: snapshot?.componentText || [item?.componentName, item?.description].filter(Boolean).join('\n'),
                make: snapshot?.make || item?.brand, specifics: snapshot?.specifics || item?.specification,
                price: snapshot?.price ?? Number(line.salePrice || 0).toFixed(2),
                amountStr: snapshot?.amountStr || Number(line.amount || 0).toFixed(2)
            };
        });
        try {
            await generateLetterheadQuotePdf({ ...custom, quotationNo: row.quotationNo,
                date: custom.date || row.date?.slice(0, 10), items, validityDays: row.validityDays,
                totalAmountStr: custom.totalAmountStr || Number(row.totalAmount || 0).toFixed(2),
                transportAmountStr: custom.transportAmountStr || Number(row.transportAmount || 0).toFixed(2),
                gstAmountStr: custom.gstAmountStr || Number(row.gstAmount || 0).toFixed(2),
                netAmountStr: custom.netAmountStr || Number(row.netAmount || 0).toFixed(2)
            }, quotationAssets({}, true), true);
        } catch {
            setError('Could not generate the historical quotation PDF.');
        }
    }

    if (!data) return <p role={error ? 'alert' : 'status'}>{error || 'Loading document history…'}</p>;
    if (service) return <section className="grid gap-4">
        {!data.length && <p>No legacy service reports.</p>}
        {data.map(report => <details open={data.length === 1} key={report._id} className="rounded border bg-white p-4">
            <summary className="cursor-pointer font-semibold">{report.reportNo} · {report.customer}</summary>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">{reportFields.filter(([field]) => report[field] != null && report[field] !== '')
                .map(([field, label]) => <div key={field}><dt className="text-slate-600">{label}</dt>
                    <dd className="whitespace-pre-wrap">{details(report[field])}</dd></div>)}</dl>
            {sections.filter(([field]) => report[field] != null).map(([field, label]) => <section key={field} className="mt-4 border-t pt-3">
                <h3 className="mb-2 font-semibold">{label}</h3>{details(report[field])}
            </section>)}
        </details>)}
    </section>;

    const training = new Map(data.training.map(row => [row._id, row]));
    const direct = new Map(data.direct.map(row => [row._id, row]));
    return <section className="grid gap-3">
        {error && <p role="alert">{error}</p>}
        {!data.quotes.length && <p>No legacy admin quotations.</p>}
        {data.quotes.map(row => {
            const lead = training.get(row.lead);
            const enquiry = direct.get(row.robotriqLead);
            return <article className="rounded border bg-white p-4" key={row._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="font-semibold">{row.quotationNo} · {money.format(row.netAmount || 0)}</h2>
                        <p>{row.customData?.customerName || enquiry?.customerName || lead?.name || '—'}</p>
                        {row.currentQuoteId && <p>Matching quotation in SkiteCRM</p>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" aria-expanded={selected === row._id}
                            onClick={() => setSelected(selected === row._id ? '' : row._id)}>Details</button>
                        <button type="button" onClick={() => download(row)}>Download PDF</button>
                    </div>
                </div>
                {selected === row._id && <dl className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                    <div><dt>Training lead</dt><dd>{lead ? [lead.codeNo, lead.name].filter(Boolean).join(' · ') :
                        row.lead ? 'Original lead record unavailable' : '—'}</dd></div>
                    <div><dt>Robotriq enquiry</dt><dd>{enquiry ? [enquiry.enquiryId, enquiry.customerName].join(' · ') : '—'}</dd></div>
                    <div><dt>Transport</dt><dd>{money.format(row.transportAmount || 0)}</dd></div>
                    <div><dt>GST</dt><dd>{money.format(row.gstAmount || 0)}</dd></div>
                    <div><dt>Validity</dt><dd>{row.validityDays ?? '—'} days</dd></div>
                </dl>}
            </article>;
        })}
    </section>;
}
