import './RobotriqWorkspace.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

export default function RobotriqLegacyTasks({ admin = false, unresolvedOnly = false }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const endpoint = `${API_BASE_URL}/api/robotriq/legacy-tasks${admin ? '' : '/mine'}`;

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setRows(data);
        }).catch(() => {
            if (!controller.signal.aborted) setError('Could not load legacy tasks.');
        });
        return () => controller.abort();
    }, [endpoint]);

    async function complete(task) {
        setBusy(true);
        setError('');
        try {
            const { data } = await axios.patch(`${endpoint}/${task._id}/complete`);
            setRows(current => current.map(row => row._id === data._id ? data : row));
        } catch {
            setError('Could not complete the task.');
        } finally {
            setBusy(false);
        }
    }

    const visibleRows = unresolvedOnly ? rows?.filter(row => row.ownerType === 'unresolved') : rows;
    if (unresolvedOnly && visibleRows?.length === 0) return null;

    return <section className="mt-4 robotriq-panel">
        <h2 className="font-semibold">{unresolvedOnly ? 'Historical tasks with unresolved assignees' : 'Legacy Robotriq tasks'}</h2>
        {error && <p role="alert">{error}</p>}
        {!rows && !error && <p role="status">Loading task history…</p>}
        {visibleRows?.length ? <ul className="divide-y">{visibleRows.map(task => <li key={task._id} className="py-2">
            <p className="font-medium">{task.title} · {task.status}</p>
            {admin && <p>{task.userName} · {task.role}{task.ownerType === 'unresolved' && ' · Legacy assignee unavailable'}</p>}
            {task.description && <p>{task.description}</p>}
            {task.dueDate && <p>Due {task.dueDate}</p>}
            {!admin && task.status !== 'Completed' && <button type="button" disabled={busy}
                className="mt-2 rounded border px-3 py-1" onClick={() => complete(task)}>Mark completed</button>}
        </li>)}</ul> : visibleRows && <p>No legacy tasks.</p>}
    </section>;
}
