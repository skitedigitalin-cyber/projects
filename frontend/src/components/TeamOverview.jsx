import { Plus } from 'lucide-react';
import './TeamOverview.css';

const stageLabels = ['To do', 'In progress', 'Review', 'Done'];
const categories = [['social', 'Social Media'], ['webdev', 'Website'], ['seo', 'SEO']];
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
const projectName = record => record.businessName || record.clientName || 'Project';
const done = record => (record.projectStatus || record.status) === 'Completed';
const deadline = value => value && Number.isFinite(Date.parse(value)) ? new Date(value) : null;

function associatedProject(task, projects) {
    const description = task.description || '';
    const explicit = /^(?:Business Name|Project):\s*(.+)$/m.exec(description)?.[1]?.trim();
    const title = task.title || '';
    if (task.projectId) return projects.find(({ project }) => String(task.projectId) === String(project._id)) || null;
    const typed = projects.filter(({ project, category }) => {
        const business = project.businessName;
        if (business && category === 'webdev' && title.startsWith(`[Web Dev] ${business} (`)) return true;
        return business && category === 'seo' && title === `[SEO Project] ${business}`;
    });
    if (typed.length === 1) return typed[0];
    const linked = explicit && explicit !== 'N/A'
        ? projects.filter(({ project }) => [project.businessName, project.clientName].includes(explicit))
        : [];
    return linked.length === 1 ? linked[0] : null;
}

function taskStage(task, project) {
    if (task.status === 'Completed') return 'Done';
    if (project?.projectStatus === 'Testing') return 'Review';
    if (project?.projectStatus === 'In Progress') return 'In progress';
    return 'To do';
}

export default function TeamOverview({ groups, tasks, loading, onOpenProject, onOpenTasks, onCreate }) {
    const now = day.format(new Date());
    const projects = categories.flatMap(([category]) => groups[category].map(project => ({ project, category })));
    const overdue = projects.filter(({ project }) => {
        const end = deadline(project.endDate);
        return end && !done(project) && day.format(end) < now;
    }).length;
    const doneCount = projects.filter(({ project }) => done(project)).length;
    const columns = Object.fromEntries(stageLabels.map(label => [label, []]));
    for (const task of tasks) {
        const link = associatedProject(task, projects);
        columns[taskStage(task, link?.project)].push({ task, link });
    }
    const metrics = [['overview', 'All', projects.length, doneCount], ...categories.map(([category, label]) =>
        [category, label, groups[category].length, groups[category].filter(done).length]
    )];

    return (
        <div className="team-reference">
            <header className="team-reference-heading">
                <div>
                    <p>Team management</p>
                    <h1>{loading ? 'Team Management' : <>{projects.length} {projects.length === 1 ? 'project' : 'projects'} <span>· {overdue} running late</span></>}</h1>
                </div>
                <details className="team-create-menu">
                    <summary><Plus size={15} /> New project</summary>
                    <div>{categories.map(([id, label]) => <button key={id} type="button" onClick={event => {
                        event.currentTarget.closest('details').open = false;
                        onCreate(id);
                    }}>{label}</button>)}</div>
                </details>
            </header>
            <section className="team-reference-metrics" aria-label="Projects by department" aria-busy={loading}>
                {metrics.map(([id, label, count, completed]) => (
                    <button key={id} type="button" data-all={id === 'overview'} onClick={() => onOpenProject(id)}>
                        <span>{label}</span>
                        <strong>{loading ? '—' : count} <small>{count === 1 ? 'project' : 'projects'}</small></strong>
                        <progress value={completed} max={count || 1} aria-label={`${label} project completion`} />
                        <span>{completed} done · {count - completed} open</span>
                    </button>
                ))}
            </section>
            <section className="team-reference-board" aria-labelledby="team-board-title" aria-busy={loading}>
                <header><h2 id="team-board-title">Live tasks · all departments</h2><button type="button" onClick={onOpenTasks}>{tasks.length} tasks →</button></header>
                <div className="team-board-columns">
                    {stageLabels.map(label => (
                        <section key={label} aria-label={label}>
                            <h3>{label}<span>{columns[label].length}</span></h3>
                            {columns[label].length ? <ul>{columns[label].map(({ task, link }) => {
                                const due = deadline(task.dueDate);
                                const overdue = due && task.status !== 'Completed' && day.format(due) < now;
                                const assignee = [task.employeeId?.firstName, task.employeeId?.lastName].filter(Boolean);
                                return (
                                    <li key={task._id}>
                                        <button type="button" onClick={() => link ? onOpenProject(link.category, link.project) : onOpenTasks()}>
                                            <strong>{task.title}</strong>
                                            <span>{link ? projectName(link.project) : task.employeeId?.department || 'Team task'}</span>
                                            <span>
                                                <small title={assignee.join(' ') || 'Unassigned'}>{assignee.map(part => part[0]).join('') || '—'}</small>
                                                <small data-overdue={!!overdue}>{task.status === 'Completed' ? 'Done' : due ? dateLabel.format(due) : 'No due date'}</small>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}</ul> : <p>{loading ? 'Loading…' : 'No tasks'}</p>}
                        </section>
                    ))}
                </div>
            </section>
        </div>
    );
}
