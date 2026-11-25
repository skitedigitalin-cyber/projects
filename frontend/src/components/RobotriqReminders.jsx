import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/reminders`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());
const input = 'rounded border bg-white px-3 py-2';
const views = [['active', 'Active'], ['today', 'Today'], ['missed', 'Missed'], ['completed', 'Completed']];

export default function RobotriqReminders({ canDelete }) {
    const [data, setData] = useState(null);
    const [editor, setEditor] = useState(null);
    const [view, setView] = useState('active');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => {
            if (!controller.signal.aborted) setData(result);
        }).catch(() => {
            if (!controller.signal.aborted) setMessage('Could not load reminders.');
        });
        return () => controller.abort();
    }, []);

    async function update(method, path, body) {
        setBusy(true);
        setMessage('');
        try {
            const { data: saved } = await axios({ url: endpoint + path, method, data: body });
            setData(current => {
                const reminders = method === 'delete' ? current.reminders.filter(row => path !== `/${row._id}`)
                    : current.reminders.some(row => row._id === saved._id)
                        ? current.reminders.map(row => row._id === saved._id ? saved : row)
                        : [...current.reminders, saved];
                return { ...current, reminders };
            });
            setEditor(null);
            setMessage(method === 'delete' ? 'Reminder deleted.' : 'Reminder saved.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not update the reminder.');
        } finally {
            setBusy(false);
        }
    }

    function save(event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        if (editor._id) return update('put', `/${editor._id}`, values);
        const [leadSource, leadId] = values.lead.split(':');
        update('post', '', { ...values, leadSource, leadId });
    }

    const day = today();
    const term = search.trim().toLowerCase();
    const rows = data?.reminders.filter(row => {
        if (view === 'completed' ? !row.completed : row.completed) return false;
        if ((view === 'today' && row.date !== day) || (view === 'missed' && row.date >= day)) return false;
        return !term || [row.leadName, row.text].some(text => text?.toLowerCase().includes(term));
    }).sort((a, b) => a.date.localeCompare(b.date));

    return <section className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">Show
                <select className={input} value={view} onChange={event => setView(event.target.value)}>
                    {views.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
            </label>
            <label className="grid gap-1">Search reminders
                <input className={input} value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <button type="button" className="rounded bg-slate-900 px-3 py-2 text-white" disabled={!data?.leads.length || busy || !!editor}
                onClick={() => setEditor({ date: day, type: 'note' })}>Add reminder</button>
        </div>
        {message && <p role="status">{message}</p>}
        {!data && !message && <p role="status">Loading reminders…</p>}
        {editor && <form className="rounded border bg-white p-4" onSubmit={save}>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <legend className="font-semibold">{editor._id ? 'Edit reminder' : 'New reminder'}</legend>
                {editor._id ? <p className="sm:col-span-2">{editor.leadName}</p> : <label className="grid gap-1 sm:col-span-2">Lead
                    <select className={input} name="lead" required defaultValue="">
                        <option value="">Select a lead</option>
                        {data.leads.map(row => <option key={`${row.source}:${row.id}`} value={`${row.source}:${row.id}`}>
                            {row.name}{row.code ? ` · ${row.code}` : ''}{row.source === 'legacy' ? ' · Legacy' : ''}
                        </option>)}
                    </select>
                </label>}
                <label className="grid gap-1">Date
                    <input className={input} type="date" name="date" required defaultValue={editor.date} />
                </label>
                <label className="grid gap-1">Reminder type
                    <select className={input} name="type" defaultValue={editor.type || 'note'}>
                        <option value="note">Note</option><option value="task">Task</option>
                    </select>
                </label>
                <label className="grid gap-1 sm:col-span-2">Reminder
                    <textarea className={input} name="text" required maxLength={2000} defaultValue={editor.text || ''} />
                </label>
                <div className="flex gap-3">
                    <button className="rounded bg-slate-900 px-3 py-2 text-white">Save reminder</button>
                    <button className={input} type="button" onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </fieldset>
        </form>}
        {rows?.length ? <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-left text-sm">
                <thead><tr>{['Date', 'Lead', 'Type', 'Reminder', 'Actions'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
                <tbody>{rows.map(row => <tr className="border-t" key={row._id}>
                    {[row.date, row.leadName, row.type, row.text].map((value, i) => <td className="p-3" key={i}>{value}</td>)}
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" disabled={busy || !!editor} onClick={() => setEditor(row)}>Edit</button>
                        <button type="button" disabled={busy || !!editor} onClick={() =>
                            update('patch', `/${row._id}/completed`, { completed: !row.completed })}>
                            {row.completed ? 'Reopen' : 'Complete'}
                        </button>
                        {canDelete && <button type="button" disabled={busy || !!editor} onClick={() => {
                            if (window.confirm('Delete this reminder?')) update('delete', `/${row._id}`);
                        }}>Delete</button>}
                    </td>
                </tr>)}</tbody>
            </table>
        </div> : rows && <p>No matching reminders.</p>}
    </section>;
}
