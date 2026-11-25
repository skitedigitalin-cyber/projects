import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const audiences = [
    { id: 'employees', label: 'Employees', permission: 'assignEmployeeTasks' },
    { id: 'students', label: 'Students', permission: 'assignTasks' }
];
const api = `${API_BASE_URL}/api/robotriq/legacy-tasks/assignments`;
const field = 'w-full rounded border bg-white px-3 py-2';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });

export function hasRobotriqTaskAccess(permissions) {
    return audiences.some(({ permission }) => permissions?.[permission] === true);
}

function TaskAssignments({ audience }) {
    const [data, setData] = useState(null);
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const endpoint = `${api}/${audience}`;

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => {
            if (!controller.signal.aborted) setData(result);
        }).catch(() => {
            if (!controller.signal.aborted) setNotice('Could not load task assignments.');
        });
        return () => controller.abort();
    }, [endpoint]);

    async function assign(event) {
        event.preventDefault();
        if (saving) return;
        const form = event.currentTarget;
        setSaving(true);
        setNotice('');
        try {
            const { data: task } = await axios.post(endpoint, Object.fromEntries(new FormData(form)));
            setData(previous => ({ ...previous, tasks: [task, ...previous.tasks] }));
            form.reset();
            setNotice('Task assigned.');
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not assign the task.');
        } finally {
            setSaving(false);
        }
    }

    const query = search.trim().toLowerCase();
    const rows = data?.tasks.filter(task => {
        const assigned = task.createdAt ? day.format(new Date(task.createdAt)) : task.dueDate;
        return (!query || [task.title, task.userName].some(value => value?.toLowerCase().includes(query))) &&
            (!start || !assigned || assigned >= start) && (!end || !assigned || assigned <= end);
    });

    return <div className="grid gap-4">
        {notice && <p role="status">{notice}</p>}
        {!data && !notice && <p role="status">Loading assignments…</p>}
        {data && <>
            <form onSubmit={assign}>
                <fieldset disabled={saving || !data.recipients.length} className="grid gap-3 sm:grid-cols-2">
                    <legend className="mb-2 font-medium">New assignment</legend>
                    <label>Assignee<select name="recipientId" className={field} required defaultValue="">
                        <option value="">{data.recipients.length ? 'Choose an assignee' : 'No assignees available'}</option>
                        {data.recipients.map(row => <option key={row._id} value={row._id}>{row.name} · {row.code}</option>)}
                    </select></label>
                    <label>Task title<input name="title" className={field} required maxLength={250} /></label>
                    <label>Description<textarea name="description" className={field} maxLength={5000} /></label>
                    <label>Due date<input name="dueDate" type="date" className={field} /></label>
                    <button className="justify-self-start rounded bg-slate-900 px-4 py-2 text-white">{saving ? 'Assigning…' : 'Assign task'}</button>
                </fieldset>
            </form>
            <div className="grid gap-3 sm:grid-cols-3">
                <label>Search tasks<input className={field} value={search} onChange={event => setSearch(event.target.value)} /></label>
                <label>Assigned from<input type="date" className={field} value={start} max={end || undefined} onChange={event => setStart(event.target.value)} /></label>
                <label>Assigned through<input type="date" className={field} value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} /></label>
            </div>
            {rows.length ? <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr>{['Task', 'Assignee', 'Assigned', 'Due', 'Status'].map(label => <th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
                    <tbody>{rows.map(task => <tr className="border-t" key={task._id}>
                        <td className="p-2"><strong>{task.title}</strong>{task.description && <p className="whitespace-pre-wrap">{task.description}</p>}</td>
                        <td className="p-2">{task.userName}</td>
                        <td className="p-2 whitespace-nowrap">{task.createdAt ? day.format(new Date(task.createdAt)) : '—'}</td>
                        <td className="p-2 whitespace-nowrap">{task.dueDate || '—'}</td>
                        <td className="p-2">{task.status}</td>
                    </tr>)}</tbody>
                </table>
            </div> : <p>No matching assignments.</p>}
        </>}
    </div>;
}

export default function RobotriqTaskAssignments({ admin = false, permissions }) {
    const [requested, setRequested] = useState('');
    const available = audiences.filter(({ permission }) => admin || permissions?.[permission] === true);
    const active = available.find(({ id }) => id === requested) || available[0];
    if (!active) return null;

    return <section className="grid gap-4 rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Task assignments</h2>
        {available.length > 1 && <nav aria-label="Task assignees" className="flex flex-wrap gap-2">
            {available.map(({ id, label }) => <button type="button" key={id} disabled={id === active.id}
                aria-current={id === active.id ? 'page' : undefined} onClick={() => setRequested(id)}
                className={`rounded border px-3 py-2 ${id === active.id ? 'bg-slate-900 text-white' : 'bg-white'}`}>{label}</button>)}
        </nav>}
        <TaskAssignments key={active.id} audience={active.id} />
    </section>;
}
