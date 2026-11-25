import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const staffUrl = `${API_BASE_URL}/api/robotriq/bookings`;
const studentUrl = `${API_BASE_URL}/api/robotriq/student/bookings`;
const input = 'rounded border bg-white px-3 py-2';
const primary = 'rounded bg-slate-900 px-3 py-2 text-white';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());

export default function RobotriqBookings({ studentToken = '', admin = false }) {
    const student = !!studentToken;
    const [records, setRecords] = useState(null);
    const [instructor, setInstructor] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [startTime, setStartTime] = useState('');
    const [version, setVersion] = useState(0);
    const [status, setStatus] = useState(admin ? 'Pending' : '');
    const endpoint = student ? studentUrl : staffUrl + (admin ? '/all' : '/mine');

    async function request(method, path, body, signal) {
        if (!student) {
            const response = await axios({ method, url: endpoint + path, data: body, signal });
            return response.data;
        }
        const result = await fetch(endpoint + path, {
            method, signal, headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        const value = await result.json().catch(() => null);
        if (!result.ok) throw new Error(value?.message || (result.status === 401
            ? 'Your student session expired. Sign in again.' : 'Could not update bookings.'));
        return value;
    }

    useEffect(() => {
        const controller = new AbortController();
        request('GET', '', undefined, controller.signal).then(result => {
            if (controller.signal.aborted) return;
            setRecords(student ? result.bookings : result);
            setInstructor(student ? result.instructor : '');
        }).catch(failure => {
            if (!controller.signal.aborted) setError(failure.response?.data?.message || failure.message);
        });
        return () => controller.abort();
    }, [endpoint, studentToken, version]);

    async function change(method, path, values, success, form) {
        setBusy(true);
        setMessage('');
        setError('');
        try {
            await request(method, path, values);
            if (form) {
                form.reset();
                setStartTime('');
            }
            setMessage(success);
            setVersion(value => value + 1);
        } catch (failure) {
            setError(failure.response?.data?.message || failure.message);
        } finally {
            setBusy(false);
        }
    }

    const visible = records?.filter(row => !status || row.status === status);
    const endTime = startTime >= '09:00' && startTime <= '15:00'
        ? `${Number(startTime.slice(0, 2)) + 3}${startTime.slice(2)}` : '';

    return <section className="grid gap-4">
        <div className="student-tab-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{student ? 'My class bookings' : 'Class bookings'}</h2>
            <button className={input} type="button" onClick={() => {
                setError('');
                setVersion(value => value + 1);
            }}>Refresh</button>
        </div>
        {student && <form className="rounded border bg-white p-4" onSubmit={event => {
            event.preventDefault();
            const form = event.currentTarget;
            change('POST', '', Object.fromEntries(new FormData(form)), 'Booking submitted for confirmation.', form);
        }}>
            <fieldset className="grid gap-3 sm:grid-cols-2" disabled={!instructor || busy}>
                <legend className="font-semibold">Book a class</legend>
                <p className="sm:col-span-2">{instructor ? `Instructor: ${instructor}` :
                    records ? 'An instructor is currently unavailable.' : 'Checking instructor availability…'}</p>
                <label className="grid gap-1">Date
                    <input name="date" className={input} type="date" min={today()} required />
                </label>
                <label className="grid gap-1">Start time (IST)
                    <input name="startTime" className={input} type="time" min="09:00" max="15:00" required
                        value={startTime} onChange={event => setStartTime(event.target.value)} />
                </label>
                <p>End time {endTime || '—'}</p>
                <button className={`${primary} justify-self-start`}>Request booking</button>
            </fieldset>
        </form>}
        {records && <label className="student-tab-panel grid gap-1">Status
            <select className={`${input} w-full max-w-xs`} value={status} onChange={event => setStatus(event.target.value)}>
                <option value="">All</option>
                {['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}
            </select>
        </label>}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {!records && !error && <p role="status">Loading bookings…</p>}
        {visible?.length > 0 && <RobotriqPagedTable rows={visible}>{pageRows =>
<table className="w-full text-left text-sm">
                <thead><tr>{['Date', 'Time (IST)', ...(student || admin ? ['Instructor'] : []), ...(!student ? ['Student'] : []),
                    'Subject', 'Status', ...(!student && !admin ? ['Actions'] : [])].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
                <tbody>{pageRows.map(row => <tr key={row._id} className="border-t">
                    <td className="p-3">{row.date}</td>
                    <td className="whitespace-nowrap p-3">{row.startTime} – {row.endTime || '—'}</td>
                    {(student || admin) && <td className="p-3">{row.teacherName}{row.unresolvedTeacher && ' · Legacy instructor'}</td>}
                    {!student && <td className="p-3">{row.studentName || (row.unresolvedStudent ? 'Legacy student link unavailable' : '—')}</td>}
                    <td className="p-3">{row.subject || '—'}</td><td className="p-3">{row.status}</td>
                    {!student && !admin && <td className="space-x-2 whitespace-nowrap p-3">{row.status === 'Pending' &&
                        ['Confirmed', 'Rejected'].map(next => <button key={next} type="button" disabled={busy}
                            onClick={() => change('PATCH', `/${row._id}/status`, { status: next }, `Booking ${next.toLowerCase()}.`)}>
                            {next === 'Confirmed' ? 'Confirm' : 'Reject'}
                        </button>)}</td>}
                </tr>)}</tbody>
            </table>
}</RobotriqPagedTable>}
        {visible?.length === 0 && <p>No matching bookings.</p>}
    </section>;
}
