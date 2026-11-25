import './RobotriqWorkspace.css';
import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/leaves`;
const control = 'robotriq-field';
const primary = 'robotriq-primary';

function HistoricalNotifications() {
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        axios.get(`${endpoint}/unassigned-notifications`, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) { setEntries(data); setError(false); }
        }).catch(() => { if (!controller.signal.aborted) setError(true); });
        return () => controller.abort();
    }, [open]);
    return <details className="robotriq-panel" onToggle={event => setOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold">Historical notifications without recipients</summary>
        {error && <p role="alert">Could not load historical notifications.</p>}
        {open && !entries && !error && <p role="status">Loading historical notifications…</p>}
        {entries?.length === 0 && <p>No historical notifications without recipients.</p>}
        {entries?.length > 0 && <ul className="divide-y">{entries.map(row => <li className="py-2" key={row._id}>
            <p className="font-medium">{row.title || row.type || 'Notification'}</p>
            <p>{row.message}</p>
            {row.createdAt && <time className="text-sm text-slate-600" dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })}
            </time>}
        </li>)}</ul>}
    </details>;
}

export default function RobotriqLeave({ studentToken = '', admin = false }) {
    const [data, setData] = useState(null);
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loadVersion, setLoadVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        request('GET', '', undefined, controller.signal).then(result => {
            if (!controller.signal.aborted) setData(admin ? { leaves: result, notifications: [] } : result);
        }).catch(error => {
            if (!controller.signal.aborted) setNotice(error.message);
        });
        return () => controller.abort();
    }, [studentToken, admin, loadVersion]);

    async function request(method, suffix, body, signal) {
        if (studentToken) {
            const result = await fetch(`${API_BASE_URL}/api/robotriq/student/leave${suffix}`, {
                method, signal, headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });
            if (result.status === 204) return undefined;
            const json = await result.json().catch(() => null);
            if (!result.ok) throw new Error(json?.message || (result.status === 401
                ? 'Your student session expired. Sign in again.' : 'Could not load or update leave requests.'));
            return json;
        }
        try {
            const { data: response } = await axios({ method, url: endpoint + (admin ? '' : '/mine') + suffix, data: body, signal });
            return response;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Could not load or update leave requests.');
        }
    }

    async function mutate(method, suffix, body, success, form) {
        setBusy(true);
        setNotice('');
        try {
            await request(method, suffix, body);
            form?.reset();
            setNotice(success);
            setLoadVersion(version => version + 1);
        } catch (error) {
            setNotice(error.message);
        } finally {
            setBusy(false);
        }
    }

    const query = search.trim().toLowerCase();
    const leaves = data?.leaves.filter(row => (!status || row.status === status) &&
        (!query || [row.userName, row.role, row.reason].some(value => value?.toLowerCase().includes(query))));
    return <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{admin ? 'Leave requests' : 'My leave requests'}</h2>
            <button type="button" className={control} onClick={() => {
                setNotice('');
                setLoadVersion(version => version + 1);
            }}>Refresh</button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {!admin && <form className="robotriq-panel" onSubmit={event => {
            event.preventDefault();
            const form = event.currentTarget;
            mutate('POST', '', Object.fromEntries(new FormData(form)), 'Leave request submitted.', form);
        }}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <legend className="font-semibold">Request leave</legend>
                <label className="grid gap-1">From<input className={control} type="date" name="fromDate" required /></label>
                <label className="grid gap-1">To<input className={control} type="date" name="toDate" required /></label>
                <label className="grid gap-1 sm:col-span-2">Reason
                    <textarea className={control} name="reason" required maxLength={2000} />
                </label>
                <button className={`${primary} justify-self-start`}>Submit request</button>
            </fieldset>
        </form>}
        {admin && <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Search by name or reason
                <input className={control} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <label className="grid gap-1">Status
                <select className={control} value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="">All</option><option>Pending</option><option>Approved</option><option>Rejected</option>
                </select>
            </label>
            {leaves?.length > 0 && (query || status) && <button type="button" className={control} disabled={busy}
                onClick={() => {
                    if (window.confirm(`Delete the ${leaves.length} matching leave requests?`)) {
                        mutate('POST', '/delete-selected', { ids: leaves.map(row => row._id) }, 'Matching leave requests deleted.');
                    }
                }}>Delete matching requests</button>}
        </div>}
        {!data && !notice && <p role="status">Loading leave requests…</p>}
        {leaves?.length > 0 && <RobotriqPagedTable rows={leaves}>{pageRows =>
<table className="w-full text-left text-sm">
                <thead><tr>{[...(admin ? ['Requester'] : []), 'From', 'To', 'Reason', 'Status', ...(admin ? ['Actions'] : [])]
                    .map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
                <tbody>{pageRows.map(row => <tr key={row._id} className="border-t">
                    {admin && <td className="p-3">{row.userName}<br />{row.role}
                        {row.ownerType === 'unresolved' && <p>Recipient link unavailable</p>}</td>}
                    {[row.fromDate, row.toDate, row.reason, row.status]
                        .map((value, i) => <td key={i} className="p-3">{value}</td>)}
                    {admin && <td className="space-x-2 whitespace-nowrap p-3">
                        {['Approved', 'Rejected'].filter(value => value !== row.status).map(value =>
                            <button type="button" disabled={busy} key={value} onClick={() =>
                                mutate('PATCH', `/${row._id}/status`, { status: value }, `Leave ${value.toLowerCase()}.`)}>
                                {value === 'Approved' ? 'Approve' : 'Reject'}
                            </button>)}
                        <button type="button" disabled={busy} onClick={() => {
                            if (window.confirm('Delete this leave request?')) {
                                mutate('DELETE', `/${row._id}`, undefined, 'Leave request deleted.');
                            }
                        }}>Delete</button>
                    </td>}
                </tr>)}</tbody>
            </table>
}</RobotriqPagedTable>}
        {leaves?.length === 0 && <p>No matching leave requests.</p>}
        {admin && <HistoricalNotifications />}
        {!admin && data && <section className="robotriq-panel">
            <h3 className="font-semibold">Notifications</h3>
            {data.notifications.length ? <ul className="divide-y">{data.notifications.map(row => <li className="py-3" key={row._id}>
                <p className="font-medium">{row.title}{!row.read && <span> · Unread</span>}</p>
                <p>{row.message}</p>
                <div className="flex gap-3">
                    {!row.read && <button type="button" disabled={busy} onClick={() => mutate('PATCH',
                        `/notifications/${row._id}/read`, undefined, 'Notification marked as read.')}>Mark as read</button>}
                    <button type="button" disabled={busy} onClick={() => mutate('DELETE',
                        `/notifications/${row._id}`, undefined, 'Notification dismissed.')}>Dismiss</button>
                </div>
            </li>)}</ul> : <p>No notifications.</p>}
        </section>}
    </section>;
}
