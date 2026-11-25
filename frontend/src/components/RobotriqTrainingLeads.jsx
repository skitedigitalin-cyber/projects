import './RobotriqWorkspace.css';
import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const api = `${API_BASE_URL}/api/robotriq/training-leads`;
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });
const fields = [
    ['codeNo', 'Lead code'], ['date', 'Date', 'date', true], ['name', 'Name', 'text', true],
    ['mobile', 'Mobile', 'tel', true], ['email', 'Email'], ['company', 'Company'],
    ['businessType', 'Business type'], ['location', 'Location', 'text', true]
];
const followUpFields = [
    ['followUpStatus', 'Lead status', ['Ok', 'Not Ok']], ['followUpResponsibility', 'Follow-up responsibility'],
    ['remainder', 'Notes'], ['remainder2Task', 'Reminder task'], ['remainder2Date', 'Reminder date', 'date'],
    ['followUpAction', 'Follow-up action', ['Pending', 'Completed']], ['advancePayment', 'Advance payment'],
    ['dealClosed', 'Deal closed', ['Yes', 'No']]
];
const control = 'w-full robotriq-field';
const action = 'rounded border px-3 py-2';
const primary = `${action} bg-slate-900 text-white`;
const splitCourses = value => (value || '').split(',').map(item => item.trim()).filter(Boolean);
const levelFor = (lead, levels) => lead.level || Object.keys(levels)[Math.min(splitCourses(lead.course).length, 5) - 1] || '';
const sourceFor = lead => lead.source || 'Meta Leads';
const dateValue = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '';

function LeadField({ definition, value }) {
    const [name, label, type = 'text', required] = definition;
    return <label>{label}{Array.isArray(type) ? <select className={control} name={name} defaultValue={value || ''}>
        <option value="">Select</option>
        {value && !type.includes(value) && <option>{value}</option>}
        {type.map(option => <option key={option}>{option}</option>)}
    </select> : <input className={control} name={name} type={type} defaultValue={value || ''} maxLength={2000} required={required} />}</label>;
}

function LeadForm({ lead, options, managers, busy, save, close }) {
    const adding = !lead._id;
    const [level, setLevel] = useState(lead.level || (!adding ? levelFor(lead, options.levels) : ''));
    const [selected, setSelected] = useState(splitCourses(lead.course));
    const certified = level === 'Certified Process Automation';
    const catalog = [...new Set([...options.courses, ...splitCourses(lead.course)])];

    function changeLevel(event) {
        const next = event.target.value;
        setLevel(next);
        setSelected(next === 'Certified Process Automation' ? options.courses : []);
    }

    function saveLead(event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        data.level = level;
        data.course = selected.join(', ');
        save(adding ? data : Object.fromEntries(Object.entries(data).filter(([key, value]) => {
            if (key === 'course') return splitCourses(lead.course).join(', ') !== value;
            if (key === 'level' && !lead.level && value === levelFor(lead, options.levels)) return false;
            if (key === 'remainder2Date') return dateValue(lead[key]) !== value;
            return (lead[key] || '') !== value;
        })));
    }

    return <form className="grid gap-3 robotriq-panel" onSubmit={saveLead}>
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{adding ? 'Add training lead' : lead.name}</h2>
            <button type="button" className={action} onClick={close}>Close</button></div>
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(definition => <LeadField key={definition[0]} definition={definition} value={lead[definition[0]]} />)}
            <label>Managed by<input className={control} name="managedBy" list="training-lead-managers" maxLength={2000} defaultValue={lead.managedBy || ''} required /></label>
            <datalist id="training-lead-managers">{managers.map(manager => <option key={manager} value={manager} />)}</datalist>
            <LeadField definition={['source', 'Source', options.sources]} value={lead.source} />
            <LeadField definition={['callStatus', 'Call status', options.calls]} value={lead.callStatus} />
            <LeadField definition={['priority', 'Priority', ['High', 'Medium', 'Low']]} value={lead.priority} />
            <label>Training level<select className={control} value={level} onChange={changeLevel} required>
                <option value="">Choose a level</option>
                {Object.keys(options.levels).map(option => <option key={option}>{option}</option>)}
            </select></label>
            <fieldset className="grid gap-2 sm:col-span-2 lg:col-span-3" disabled={!level || certified}>
                <legend>Courses{level && !certified && ` (up to ${options.levels[level]})`}</legend>
                {catalog.map(course => <label className="flex items-center gap-2" key={course}>
                    <input type="checkbox" checked={selected.includes(course)}
                        disabled={!selected.includes(course) && selected.length >= options.levels[level]}
                        onChange={event => setSelected(previous => event.target.checked
                            ? [...previous, course] : previous.filter(item => item !== course))} />{course}</label>)}
            </fieldset>
            {!adding && followUpFields.map(definition => <LeadField key={definition[0]} definition={definition}
                value={definition[2] === 'date' ? dateValue(lead[definition[0]]) : lead[definition[0]]} />)}
            <button className={`${primary} justify-self-start`}>{busy ? 'Saving…' : 'Save lead'}</button>
        </fieldset>
    </form>;
}

export default function RobotriqTrainingLeads({ admin = false }) {
    const [data, setData] = useState(null);
    const [revision, setRevision] = useState(0);
    const [source, setSource] = useState('');
    const [filter, setFilter] = useState({ search: '', date: '', level: '', status: '' });
    const [editing, setEditing] = useState(null);
    const [reminding, setReminding] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(api, { signal: controller.signal }).then(({ data: result }) => {
            if (!controller.signal.aborted) setData(result);
        }).catch(() => {
            if (!controller.signal.aborted) setNotice('Could not load training leads.');
        });
        return () => controller.abort();
    }, [revision]);

    async function update(method, path, values, message, done) {
        setBusy(true);
        setNotice('');
        try {
            await axios({ method, url: api + path, data: values });
            done?.();
            setNotice(message);
            setRevision(value => value + 1);
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not update the training lead.');
        } finally {
            setBusy(false);
        }
    }

    if (!data) return <p role="status">{notice || 'Loading training leads…'}</p>;
    const { leads, reminders, options } = data;
    const related = new Map(leads.map(lead => [lead._id, lead]));
    const managers = [...new Set(leads.map(lead => lead.managedBy).filter(Boolean))].sort();
    const search = filter.search.trim().toLowerCase();
    const rows = leads.filter(lead => (!source || sourceFor(lead) === source) && (!filter.date || lead.date === filter.date) &&
        (!filter.level || levelFor(lead, options.levels) === filter.level) && (!filter.status || (lead.callStatus || 'Pending') === filter.status) &&
        (!search || [lead.name, lead.codeNo, lead.mobile, lead.company, lead.location, lead.course, lead.managedBy]
            .some(value => value?.toLowerCase().includes(search))));
    const selectedReminders = reminders.filter(row => showCompleted || !row.completed);
    const edit = editing === 'new' ? { date: day.format(new Date()), source: source || 'Meta Leads', callStatus: 'Pending', priority: 'Medium' }
        : related.get(editing);

    return <section className="grid gap-4 robotriq-panel">
        <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Training Leads Hub</h2>
            <button className={primary} type="button" onClick={() => setEditing('new')}>Add lead</button>
        </header>
        {notice && <p role="status">{notice}</p>}
        {edit && <LeadForm key={editing} lead={edit} options={options} managers={managers} busy={busy}
            close={() => setEditing(null)} save={values => {
                if (!Object.keys(values).length) return setEditing(null);
                update(edit._id ? 'PATCH' : 'POST', edit._id ? `/${edit._id}` : '', values, 'Training lead saved.', () => setEditing(null));
            }} />}
        <nav aria-label="Training lead sources" className="flex flex-wrap gap-2">
            {['', ...options.sources].map(option => <button type="button" className={source === option ? primary : action}
                aria-current={source === option ? 'page' : undefined} key={option} onClick={() => setSource(option)}>
                {option || 'All leads'} ({option ? leads.filter(lead => sourceFor(lead) === option).length : leads.length})</button>)}
        </nav>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>Search leads<input className={control} value={filter.search} onChange={event => setFilter({ ...filter, search: event.target.value })} /></label>
            <label>Lead date<input className={control} type="date" value={filter.date} onChange={event => setFilter({ ...filter, date: event.target.value })} /></label>
            <label>Filter by level<select className={control} value={filter.level} onChange={event => setFilter({ ...filter, level: event.target.value })}>
                <option value="">All levels</option>{Object.keys(options.levels).map(option => <option key={option}>{option}</option>)}
            </select></label>
            <label>Filter by call status<select className={control} value={filter.status} onChange={event => setFilter({ ...filter, status: event.target.value })}>
                <option value="">All statuses</option>{options.calls.map(option => <option key={option}>{option}</option>)}
            </select></label>
        </div>
        {rows.length ? <RobotriqPagedTable rows={rows}>{pageRows =>
<table className="w-full text-left text-sm">
            <thead><tr>{['Lead', 'Contact', 'Training', 'Managed by', 'Call status', 'Actions'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
            <tbody>{pageRows.map(row => <tr className="border-t" key={row._id}>
                <td className="p-2"><button type="button" className="font-semibold underline" onClick={() => setEditing(row._id)}>{row.name}</button>
                    <p>{[row.codeNo, row.date].filter(Boolean).join(' · ')}</p></td>
                <td className="p-2 whitespace-nowrap">{row.mobile && <a href={`tel:${row.mobile.replace(/[^+\d]/g, '')}`}>{row.mobile}</a>}<p>{row.company || row.location}</p></td>
                <td className="p-2">{levelFor(row, options.levels)}<p>{row.course}</p></td>
                <td className="p-2">{row.managedBy}</td>
                <td className="p-2"><select className={control} aria-label={`Call status for ${row.name}`} disabled={busy}
                    value={row.callStatus || 'Pending'} onChange={event => update('PATCH', `/${row._id}`, { callStatus: event.target.value }, 'Call status updated.')}>
                    {row.callStatus && !options.calls.includes(row.callStatus) && <option>{row.callStatus}</option>}
                    {options.calls.map(option => <option key={option}>{option}</option>)}</select></td>
                <td className="p-2"><div className="flex flex-wrap gap-2">
                    <button type="button" className={action} onClick={() => setReminding(row._id)}>Add reminder</button>
                    {admin && <button type="button" className={action} disabled={busy} onClick={() => {
                        if (window.confirm(`Remove ${row.name} from the Training Leads Hub?`)) update('DELETE', `/${row._id}`, undefined, 'Training lead removed.');
                    }}>Remove</button>}
                </div></td>
            </tr>)}</tbody>
        </table>
}</RobotriqPagedTable> : <p>No training leads match these filters.</p>}
        {related.has(reminding) && <form className="grid gap-3 rounded border p-4" key={reminding} onSubmit={event => {
            event.preventDefault();
            update('POST', `/${reminding}/reminders`, Object.fromEntries(new FormData(event.currentTarget)), 'Reminder added.', () => setReminding(''));
        }}>
            <h3 className="font-semibold">Reminder for {related.get(reminding).name}</h3>
            <label>Reminder text<textarea className={control} name="text" required maxLength={2000} /></label>
            <label>Reminder date<input className={control} name="date" type="date" required defaultValue={day.format(new Date())} /></label>
            <div className="flex gap-2"><button className={primary} disabled={busy}>Save reminder</button>
                <button className={action} type="button" onClick={() => setReminding('')}>Cancel</button></div>
        </form>}
        <div className="grid gap-2">
            <h3 className="font-semibold">Follow-up reminders</h3>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showCompleted}
                onChange={event => setShowCompleted(event.target.checked)} />Show completed reminders</label>
            {selectedReminders.length ? <ul className="divide-y">{selectedReminders.map(row => <li className="flex flex-wrap items-start justify-between gap-2 py-2" key={row._id}>
                <div><button className="font-medium underline" type="button" onClick={() => setEditing(row.leadId)}>{related.get(row.leadId)?.name || row.leadName}</button>
                    <p>{row.date} · {row.text}</p></div>
                {row.completed ? <span>Completed</span> : <button className={action} type="button" disabled={busy}
                    onClick={() => update('PATCH', `/${row.leadId}/reminders/${row._id}/complete`, undefined, 'Reminder completed.')}>Complete</button>}
            </li>)}</ul> : <p>No reminders to show.</p>}
        </div>
    </section>;
}
