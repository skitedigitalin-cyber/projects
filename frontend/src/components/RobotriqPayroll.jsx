import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/payroll`;
const indiaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const control = 'rounded border bg-white px-3 py-2';

export default function RobotriqPayroll() {
    const [range, setRange] = useState(() => {
        const today = indiaDate.format(new Date());
        return { from: `${today.slice(0, 7)}-01`, to: today, source: 'current' };
    });
    const [search, setSearch] = useState('');
    const [entries, setEntries] = useState(null);
    const [manual, setManual] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (!range.from || !range.to || range.from > range.to) return;
        const controller = new AbortController();
        axios.get(endpoint, { params: range, signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setEntries(data.records);
        }).catch(() => {
            if (!controller.signal.aborted) setError('Could not load payroll.');
        });
        return () => controller.abort();
    }, [range]);

    function changeRange(field, value) {
        if (range[field] === value) return;
        setEntries(null);
        setError('');
        setManual({});
        setRange(current => ({ ...current, [field]: value }));
    }

    function changeManual(id, field, value) {
        setManual(current => ({ ...current, [id]: { ...current[id], [field]: value } }));
    }

    const term = search.trim().toLowerCase();
    const rows = entries?.filter(row => [row.name, row.employeeCode].some(value => value.toLowerCase().includes(term)))
        .map(row => {
            const values = manual[row._id] || {};
            const rate = values.rate ?? row.rate;
            const adjustment = values.adjustment ?? 0;
            const days = row.presentDays + Number(adjustment);
            return { ...row, rate, adjustment, days, total: Math.round(days * Number(rate)) };
        });
    const invalidRange = !range.from || !range.to || range.from > range.to;

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Attendance source
                <select className={control} value={range.source} onChange={event => changeRange('source', event.target.value)}>
                    <option value="current">SkiteCRM attendance</option>
                    <option value="legacy">Legacy Robotriq history</option>
                </select>
            </label>
            {[['from', 'From'], ['to', 'To']].map(([field, label]) => <label className="grid gap-1" key={field}>{label}
                <input className={control} type="date" value={range[field]} onChange={event => changeRange(field, event.target.value)} />
            </label>)}
            <label className="grid gap-1">Find employee
                <input className={control} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            {Object.keys(manual).length > 0 && <button type="button" className={control} onClick={() => setManual({})}>Reset adjustments</button>}
        </div>
        <p>Robotriq payroll counts attendance marked Present. Daily rate overrides and day adjustments apply to this calculation.</p>
        {invalidRange && <p role="alert">Choose a valid date range.</p>}
        {error && <p role="alert">{error}</p>}
        {!entries && !error && !invalidRange && <p role="status">Loading payroll…</p>}
        {rows?.length > 0 && <>
            <p>Total payroll <strong>{money.format(rows.reduce((sum, row) => sum + row.total, 0))}</strong></p>
            <div className="overflow-x-auto rounded border bg-white">
                <table className="w-full text-left text-sm">
                    <thead><tr>{['Employee', 'Daily rate', 'Present days', 'Day adjustment', 'Payable days', 'Total'].map(label =>
                        <th scope="col" className="p-3" key={label}>{label}</th>)}</tr></thead>
                    <tbody>{rows.map(row => <tr key={row._id} className="border-t">
                        <th scope="row" className="p-3">{row.name}<br /><span className="font-normal">{row.employeeCode}</span></th>
                        <td className="p-3"><input aria-label={`Daily rate for ${row.name}`} type="number" min="0" step="any"
                            className="w-28 rounded border p-2" value={row.rate} onChange={event => {
                                const value = event.target.value;
                                if (Number(value) >= 0) changeManual(row._id, 'rate', value);
                            }} /></td>
                        <td className="p-3">{row.dates.length ? <details>
                            <summary className="cursor-pointer">{row.presentDays} days</summary>
                            <ul>{row.dates.map((day, i) => <li key={`${day}-${i}`}>{day}</li>)}</ul>
                        </details> : 0}</td>
                        <td className="p-3"><input aria-label={`Day adjustment for ${row.name}`} type="number" step="any"
                            className="w-24 rounded border p-2" value={row.adjustment}
                            onChange={event => changeManual(row._id, 'adjustment', event.target.value)} /></td>
                        <td className="p-3">{row.days}</td><td className="p-3 font-semibold">{money.format(row.total)}</td>
                    </tr>)}</tbody>
                </table>
            </div>
        </>}
        {rows?.length === 0 && <p>No payroll records found for this source.</p>}
    </section>;
}
