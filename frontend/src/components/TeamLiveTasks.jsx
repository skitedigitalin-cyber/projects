import { useState } from 'react';
import { Search } from 'lucide-react';
import { associatedProject } from './TeamOverview';
import './TeamWorkspace.css';

const departments = [['all', 'All'], ['social', 'Social'], ['webdev', 'Web'], ['seo', 'SEO']];
const columnNames = ['Overdue', 'Due today', 'Upcoming', 'Completed'];
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
const employeeName = employee => [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || 'Unassigned';
const pageSize = 15;

export default function TeamLiveTasks({ tasks, groups, onToggle }) {
    const [department, setDepartment] = useState('all');
    const [assignee, setAssignee] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [updating, setUpdating] = useState(null);
    const projects = Object.entries(groups).flatMap(([category, rows]) => rows.map(project => ({ project, category })));
    const people = [...new Map(tasks.filter(task => task.employeeId?._id).map(task => [String(task.employeeId._id), employeeName(task.employeeId)]))];
    const today = day.format(new Date());
    const filtered = tasks.map(task => {
        const link = associatedProject(task, projects);
        const date = task.dueDate && Number.isFinite(Date.parse(task.dueDate)) ? new Date(task.dueDate) : null;
        const key = date && day.format(date);
        const column = task.status === 'Completed' ? 'Completed' : key && key < today ? 'Overdue' : key === today ? 'Due today' : 'Upcoming';
        const client = link?.project.businessName || link?.project.clientName;
        return { task, category: link?.category, client, date, column };
    }).filter(({ task, category, client }) => (department === 'all' || category === department)
        && (!assignee || String(task.employeeId?._id) === assignee)
        && (!status || task.status === status)
        && [task.title, task.description, client, employeeName(task.employeeId)].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pages);
    const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <section className="team-live-tasks" aria-label="Live team tasks">
            <div className="team-live-tools">
                <div role="group" aria-label="Team department">
                    {departments.map(([id, label]) => <button key={id} type="button" aria-pressed={id === department} onClick={() => { setDepartment(id); setPage(1); }}>{label}</button>)}
                </div>
                <select aria-label="Team member" value={assignee} onChange={event => { setAssignee(event.target.value); setPage(1); }}>
                    <option value="">Everyone</option>
                    {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <select aria-label="Task status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
                    <option value="">All statuses</option><option>Pending</option><option>Completed</option>
                </select>
                <label><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search tasks" placeholder="Search tasks" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
            </div>
            <div className="team-live-columns">
                {columnNames.map(column => (
                    <section key={column} aria-label={column}>
                        <h2>{column}<span>{filtered.filter(row => row.column === column).length}</span></h2>
                        <ul>{shown.filter(row => row.column === column).map(({ task, category, client, date }) => (
                            <li key={task._id}>
                                <header><small>{departments.find(([id]) => id === category)?.[1] || 'General'}</small><time dateTime={task.dueDate}>{date ? dateLabel.format(date) : 'No due date'}</time></header>
                                <strong data-completed={task.status === 'Completed'}>{task.title}</strong>
                                {(client || task.description) && <p title={task.description}>{client || task.description}</p>}
                                <footer><span>{employeeName(task.employeeId)}{task.priority === 'High' ? ' · High' : ''}</span>
                                    <button type="button" disabled={updating === task._id} onClick={async () => {
                                        setUpdating(task._id);
                                        try { await onToggle(task._id, task.status); } finally { setUpdating(null); }
                                    }}>{task.status === 'Completed' ? 'Undo' : 'Done'}</button></footer>
                            </li>
                        ))}</ul>
                        {!filtered.some(row => row.column === column) && <p className="team-live-empty">No tasks</p>}
                    </section>
                ))}
            </div>
            {pages > 1 && <div className="team-live-tools team-live-pagination">
                <span>Page {currentPage} of {pages}</span>
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
                <button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>}
        </section>
    );
}
