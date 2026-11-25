import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/staff-access`;

export default function RobotriqStaffAccess() {
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [draft, setDraft] = useState({});
    const [notice, setNotice] = useState('');
    const [load, setLoad] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data: result }) => {
            if (!controller.signal.aborted) setData(result);
        }).catch(() => {
            if (!controller.signal.aborted) setNotice('Could not load Robotriq staff access.');
        });
        return () => controller.abort();
    }, [load]);

    const selected = data?.staff.find(row => row._id === selectedId);
    const changed = selected ? Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== selected.permissions[key])) : {};
    const query = search.trim().toLowerCase();
    const employees = data?.staff.filter(row => [row.name, row.employeeCode, row.role].some(value => value?.toLowerCase().includes(query)));

    function select(row) {
        setSelectedId(row._id);
        setDraft({});
        setNotice('');
    }

    async function save(event) {
        event.preventDefault();
        if (saving || !selected || !Object.keys(changed).length) return;
        setSaving(true);
        setNotice('');
        try {
            const { data: saved } = await axios.patch(`${endpoint}/${selected._id}`, { permissions: changed, updatedAt: selected.updatedAt });
            setData(previous => ({ ...previous, staff: previous.staff.map(row => row._id === saved._id ? { ...row, ...saved } : row) }));
            setDraft({});
            setNotice(`Saved access for ${saved.name}.`);
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not save staff access.');
        } finally {
            setSaving(false);
        }
    }

    return <section className="grid gap-4 rounded border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="grid gap-1">Search staff<input className="rounded border px-3 py-2" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <button type="button" className="rounded border px-3 py-2" disabled={saving} onClick={() => {
                setDraft({});
                setNotice('');
                setLoad(value => value + 1);
            }}>Reload permissions</button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {!data && !notice && <p role="status">Loading staff access…</p>}
        {employees && <div className="grid gap-4 md:grid-cols-[minmax(200px,1fr)_2fr]">
            <div className="max-h-[32rem] overflow-auto" aria-label="Staff accounts">
                {employees.length ? employees.map(row => <button type="button" disabled={saving} key={row._id}
                    aria-pressed={selectedId === row._id} onClick={() => select(row)}
                    className={`grid w-full gap-1 rounded border px-3 py-2 text-left ${selectedId === row._id ? 'border-slate-900 bg-slate-50' : ''}`}>
                    <strong>{row.name}</strong><span>{[row.employeeCode, row.role, row.paused ? 'Role review required' : ''].filter(Boolean).join(' · ')}</span>
                </button>) : <p>No matching staff.</p>}
            </div>
            {selected ? <form className="grid gap-4" onSubmit={save}>
                <h2 className="font-semibold">{selected.name}</h2>
                {selected.paused && <p>Resolve this account’s role before changing its imported permissions.</p>}
                {['Dashboard', 'Sales'].map(group => <fieldset key={group} disabled={saving || selected.paused} className="grid gap-2 rounded border p-3">
                    <legend className="px-1 font-medium">{group}</legend>
                    {group === 'Sales' && selected.role === 'Sales' && <p>Provided by the Sales role.</p>}
                    {data.modules.filter(module => module.group === group && (group !== 'Sales' || module.id === 'salesCustomers')).map(({ id, label }) => <label className="flex items-center gap-2" key={id}>
                        <input type="checkbox" checked={draft[id] ?? selected.permissions[id]}
                            disabled={group === 'Sales' && selected.role === 'Sales'}
                            onChange={event => setDraft(previous => ({ ...previous, [id]: event.target.checked }))} />{label}
                    </label>)}
                </fieldset>)}
                <button className="justify-self-start rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-45"
                    disabled={saving || selected.paused || !Object.keys(changed).length}>{saving ? 'Saving…' : 'Save permissions'}</button>
            </form> : <p>Select a staff account to view its permissions.</p>}
        </div>}
    </section>;
}
