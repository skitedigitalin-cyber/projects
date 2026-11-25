import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const api = `${API_BASE_URL}/api/robotriq/attendance`;
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
const control = 'rounded border bg-white px-3 py-2';
const primary = 'rounded bg-slate-900 px-3 py-2 text-white';
const statuses = ['Present', 'Absent', 'Half Day', 'On Leave', 'In Office'];

export default function RobotriqAttendanceReview({ admin = false }) {
    const [data, setData] = useState(null);
    const [view, setView] = useState('requests');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        axios.get(admin ? api : `${api}/mine`, { signal: controller.signal }).then(({ data: result }) => {
            if (!controller.signal.aborted) setData(result);
        }).catch(() => {
            if (!controller.signal.aborted) setNotice('Could not load attendance history or requests.');
        });
        return () => controller.abort();
    }, [admin, refresh]);

    async function update(method, path, payload, message, form) {
        setBusy(true);
        setNotice('');
        try {
            await axios({ method, url: api + path, data: payload });
            form?.reset();
            setNotice(message);
            setRefresh(value => value + 1);
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not update attendance.');
        } finally {
            setBusy(false);
        }
    }

    const query = search.trim().toLowerCase();
    const source = view === 'requests' ? data?.requests : view === 'legacy' ? data?.history : data?.attendance;
    const rows = source?.filter(row => !query || [row.userName, row.date, row.status, row.reason]
        .some(value => value?.toLowerCase().includes(query)));

    return <section className="mt-4 grid gap-4 rounded border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-semibold">{admin ? 'Robotriq attendance review' : 'My checkout requests'}</h2>
            <button type="button" className={control} onClick={() => {
                setNotice('');
                setRefresh(value => value + 1);
            }}>Refresh</button>
        </div>
        {!admin && <form onSubmit={event => {
            event.preventDefault();
            const form = event.currentTarget;
            update('POST', '/mine/checkout-request', Object.fromEntries(new FormData(form)), 'Checkout request submitted.', form);
        }}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <legend className="font-semibold">Forgot to check out</legend>
                <label className="grid gap-1">Date
                    <input className={control} name="date" type="date" max={day.format(new Date())} required />
                </label>
                <label className="grid gap-1">Reason
                    <textarea className={control} name="reason" maxLength={2000} required />
                </label>
                <button className={`${primary} justify-self-start`}>Submit request</button>
            </fieldset>
        </form>}
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">View
                <select className={control} value={view} onChange={event => setView(event.target.value)}>
                    <option value="requests">Checkout requests</option>
                    <option value="legacy">Legacy attendance history</option>
                    {admin && <option value="current">Correct current attendance status</option>}
                </select>
            </label>
            <label className="grid gap-1">Search records
                <input className={control} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
        </div>
        {notice && <p role="status">{notice}</p>}
        {!data && !notice && <p role="status">Loading attendance records…</p>}
        {rows?.length ? <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead><tr>{[...(admin ? ['Employee'] : []), 'Date',
                    ...(view === 'requests' ? ['Reason'] : ['Check-in', 'Checkout', 'Work summary']), 'Status',
                    ...(admin && view === 'requests' ? ['Actions'] : [])].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
                <tbody>{rows.map(row => <tr className="border-t" key={row._id}>
                    {admin && <td className="p-3">{row.userName || '—'}
                        {row.ownerType === 'unresolved' && <p>Legacy requester unavailable</p>}</td>}
                    <td className="p-3">{row.date}</td>
                    {view === 'requests' ? <td className="p-3">{row.reason}</td> : <>
                        <td className="p-3">{row.checkInTime ? time.format(new Date(row.checkInTime)) : row.checkIn || '—'}</td>
                        <td className="p-3">{row.checkOutTime ? time.format(new Date(row.checkOutTime)) : row.checkOut || '—'}</td>
                        <td className="p-3">{row.workSummary || row.notes || '—'}</td>
                    </>}
                    <td className="p-3">{view === 'current' ? <select className={control}
                        aria-label={`Status for ${row.userName || 'employee'} on ${row.date}`} disabled={busy} value={row.status}
                        onChange={event => update('PATCH', `/${row._id}/status`, { status: event.target.value }, 'Attendance status updated.')}>
                        {!statuses.includes(row.status) && <option value={row.status}>{row.status || '—'}</option>}
                        {statuses.map(value => <option key={value}>{value}</option>)}
                    </select> : row.status || '—'}</td>
                    {admin && view === 'requests' && <td className="space-x-2 whitespace-nowrap p-3">{row.status === 'Pending' && <>
                        <button type="button" disabled={busy} onClick={() =>
                            update('POST', `/checkout-requests/${row._id}/approve`, undefined, 'Checkout request accepted.')}>Accept</button>
                        <button type="button" disabled={busy} onClick={() => {
                            if (window.confirm('Delete this checkout request?')) update('DELETE',
                                `/checkout-requests/${row._id}`, undefined, 'Checkout request deleted.');
                        }}>Delete</button>
                    </>}</td>}
                </tr>)}</tbody>
            </table>
        </div> : rows && <p>No matching records.</p>}
    </section>;
}
