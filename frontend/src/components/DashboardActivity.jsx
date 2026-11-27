import { ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { compactRupees } from './DashboardNumbers';
import './DashboardActivity.css';

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const stageColors = ['#dededb', '#b2b2ae', '#7a7a76', '#111', '#ff6a3d'];

function Today({ followUps, loading, navigate }) {
    return (
        <section
            className="dashboard-panel dashboard-card-clickable"
            aria-labelledby="dashboard-today-title"
            onClick={() => navigate('/sales')}
            role="button"
            tabIndex={0}
            title="View Sales Follow-ups"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/sales'); } }}
        >
            <header>
                <h2 id="dashboard-today-title">Today</h2>
                <Link to="/sales" onClick={(e) => e.stopPropagation()}>See all →</Link>
            </header>
            {followUps?.length > 0 ? (
                <ul className="dashboard-followups">
                    {followUps.map(item => (
                        <li key={item.id} onClick={(e) => e.stopPropagation()}>
                            <Link to={`/sales/lead/edit/${item.id}`}>
                                <time dateTime={item.date} className={item.overdue ? 'dashboard-followup-overdue' : undefined}>
                                    {item.overdue ? 'Overdue' : time.format(new Date(item.date))}
                                </time>
                                <span>{item.name}<small>{item.status}</small></span>
                                <span className="dashboard-followup-open" aria-hidden="true"><ArrowUpRight size={15} /></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : <p className="dashboard-panel-muted">{loading ? 'Loading follow-ups…' : followUps ? 'No follow-ups due today.' : 'Follow-ups unavailable.'}</p>}
        </section>
    );
}

function Pipeline({ stats, loading, period = 'month', navigate }) {
    const periodData = stats?.pipelinePeriods?.[period] || {
        stages: stats?.stages || [],
        totalValue: stats?.totalPipelineValue || 0,
        dealCount: stats?.dealCount ?? (stats?.stages ? stats.stages.reduce((total, stage) => total + stage.count, 0) : 0)
    };
    const stages = periodData.stages;
    const totalValue = periodData.totalValue;
    const dealCount = periodData.dealCount;
    const periodLabel = {
        today: 'Pipeline value today',
        week: 'Pipeline value this week',
        month: 'Pipeline value this month'
    }[period] || 'Pipeline value across stages';

    return (
        <section
            className="dashboard-panel dashboard-card-clickable"
            aria-labelledby="dashboard-pipeline-title"
            onClick={() => navigate('/sales')}
            role="button"
            tabIndex={0}
            title="View Sales Pipeline"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/sales'); } }}
        >
            <header>
                <h2 id="dashboard-pipeline-title">Pipeline</h2>
                <Link to="/sales" aria-label="View pipeline in Sales & Leads" onClick={(e) => e.stopPropagation()}>
                    {stages ? `${dealCount} ${dealCount === 1 ? 'deal' : 'deals'}` : 'View pipeline'} →
                </Link>
            </header>
            <p className="dashboard-panel-amount">{stats ? compactRupees(totalValue ?? 0) : '—'}</p>
            <p className="dashboard-panel-muted">{periodLabel}</p>
            {stages?.length > 0 ? (
                <>
                    <div className="dashboard-stage-track" key={period} aria-hidden="true">
                        {stages.map((stage, index) => (
                            <span key={stage.name} style={{ flex: stage.count, background: stageColors[Math.min(index, stageColors.length - 1)] }} />
                        ))}
                    </div>
                    <ul className="dashboard-stages" key={`stages-${period}`}>
                        {stages.map((stage, index) => (
                            <li key={stage.name}>
                                <span className="dashboard-stage-dot" style={{ background: stageColors[Math.min(index, stageColors.length - 1)] }} />
                                <span>{stage.name}</span><span>{stage.count}</span><strong>{compactRupees(stage.value)}</strong>
                            </li>
                        ))}
                    </ul>
                </>
            ) : <p className="dashboard-panel-muted">{loading ? 'Loading stages…' : stages ? 'No deals in the pipeline.' : 'Stage breakdown unavailable.'}</p>}
        </section>
    );
}

function Revenue({ records, loading, navigate }) {
    const max = Math.max(1, ...(records || []).flatMap(record => [record.invoiced, record.collected]));
    return (
        <section
            className="dashboard-panel dashboard-card-clickable"
            aria-labelledby="dashboard-revenue-title"
            onClick={() => navigate('/finance')}
            role="button"
            tabIndex={0}
            title="View Finance & Revenue"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/finance'); } }}
        >
            <header>
                <h2 id="dashboard-revenue-title">Revenue</h2>
                <span className="dashboard-revenue-legend"><i /> Invoiced <i /> Collected</span>
            </header>
            {records?.length > 0 ? (
                <ul className="dashboard-revenue-bars">
                    {records.map((record, index) => {
                        const label = month.format(new Date(`${record.month}-01T00:00:00Z`));
                        return (
                            <li key={record.month} aria-label={`${label}: ${currency.format(record.invoiced)} invoiced, ${currency.format(record.collected)} collected`}>
                                <div title={`${currency.format(record.invoiced)} invoiced · ${currency.format(record.collected)} collected`} aria-hidden="true">
                                    <span style={{ height: `${record.invoiced / max * 100}%` }} />
                                    <span style={{ height: `${record.collected / max * 100}%`, '--revenue-delay': `${index * 13}ms` }} />
                                </div>
                                <small aria-hidden="true">{label}</small>
                            </li>
                        );
                    })}
                </ul>
            ) : <p className="dashboard-panel-muted">{loading ? 'Loading revenue…' : 'Revenue unavailable.'}</p>}
        </section>
    );
}

function RatioCard({ title, value, note, progress, accent = false, comparison, onClick, children }) {
    return (
        <article
            className={`dashboard-panel dashboard-ratio ${onClick ? 'dashboard-card-clickable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            title={title}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        >
            <header><h3>{title}</h3>{comparison && <span>{comparison}</span>}</header>
            <div>
                <strong>{value}</strong>
                {progress != null && (
                    <svg viewBox="0 0 40 40" width="62" height="62" aria-hidden="true">
                        <circle cx="20" cy="20" r="17" fill="none" stroke="#f0f0ee" strokeWidth="4" />
                        <circle cx="20" cy="20" r="17" fill="none" stroke={accent ? '#ff6a3d' : '#111'} strokeWidth="4"
                            pathLength="100" strokeDasharray={`${Math.min(100, progress)} 100`} strokeLinecap="round" transform="rotate(-90 20 20)" />
                    </svg>
                )}
            </div>
            {children}
            <p>{note}</p>
        </article>
    );
}

function MonthlyRatios({ overview, salesTarget, loading, navigate }) {
    const { attendance, projects, income, expense } = overview || {};
    const attendancePct = attendance?.scheduledDays ? Math.round(attendance.presentDays / attendance.scheduledDays * 100) : null;
    const projectPct = projects?.total ? Math.round(projects.completed / projects.total * 100) : null;
    const targetPct = salesTarget?.target > 0 ? Math.round(salesTarget.collected / salesTarget.target * 100) : null;
    const targetChange = targetPct !== null && salesTarget.previousProgress != null ? targetPct - salesTarget.previousProgress : null;
    const unavailable = loading ? 'Loading…' : 'Data unavailable';
    const monthLabel = overview?.month
        ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${overview.month}-01T00:00:00Z`))
        : '';

    return (
        <section className="dashboard-ratios" aria-labelledby="dashboard-ratios-title">
            <header><h2 id="dashboard-ratios-title">Monthly ratios</h2><span>{monthLabel}</span></header>
            <div className="dashboard-ratio-grid">
                <RatioCard
                    title="Attendance"
                    value={attendancePct == null ? '—' : `${attendancePct}%`}
                    progress={attendancePct}
                    note={attendance?.scheduledDays ? `${attendance.presentDays} of ${attendance.scheduledDays} recorded employee days` : overview ? 'No working days recorded' : unavailable}
                    onClick={() => navigate('/hr')}
                />
                <RatioCard
                    title="Sales vs target"
                    value={targetPct == null ? '—' : `${targetPct}%`}
                    progress={targetPct}
                    comparison={targetChange == null ? null : `${targetChange > 0 ? '+' : ''}${targetChange} pts vs last month`}
                    note={targetPct == null ? loading ? 'Loading target…' : 'No monthly sales target configured'
                        : `${compactRupees(salesTarget.collected)} of ${compactRupees(salesTarget.target)} target`}
                    accent
                    onClick={() => navigate('/sales')}
                />
                <RatioCard
                    title="Income : Expense"
                    value={expense > 0 ? `${(income / expense).toFixed(1)} : 1` : '—'}
                    note={overview ? `In ${compactRupees(income)} · Out ${compactRupees(expense)}` : unavailable}
                    onClick={() => navigate('/accounts')}
                >
                    {income + expense > 0 && <div className="dashboard-ratio-segments" aria-hidden="true"><i style={{ flex: income }} /><i style={{ flex: expense }} /></div>}
                </RatioCard>
                <RatioCard
                    title="Project completion"
                    value={projectPct == null ? '—' : `${projectPct}%`}
                    note={projects ? `${projects.completed} of ${projects.total} done · ${projects.overdue} late` : unavailable}
                    onClick={() => navigate('/team-management')}
                >
                    {projects?.total > 0 && <div className="dashboard-project-segments" aria-hidden="true">
                        {Array.from({ length: Math.min(12, projects.total) }, (_, index) => {
                            const count = Math.min(12, projects.total);
                            const done = Math.round(projects.completed / projects.total * count);
                            const late = Math.min(count - done, Math.round(projects.overdue / projects.total * count));
                            return <i key={index} data-project-status={index < done ? 'done' : index >= count - late ? 'late' : 'open'} />;
                        })}
                    </div>}
                </RatioCard>
            </div>
        </section>
    );
}

function Team({ team, loading, navigate }) {
    return (
        <section
            className="dashboard-panel dashboard-card-clickable"
            aria-labelledby="dashboard-team-title"
            onClick={() => navigate('/team-management')}
            role="button"
            tabIndex={0}
            title="View Team Management"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/team-management'); } }}
        >
            <header><h2 id="dashboard-team-title">Team</h2>{team && <span>{team.present} of {team.total} in today</span>}</header>
            {team?.members.length > 0 ? (
                <ul className="dashboard-team">
                    {team.members.map(member => (
                        <li key={member.id}>
                            <span className="dashboard-team-avatar" data-present={member.present} aria-hidden="true">
                                {member.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}
                            </span>
                            <div>
                                <div><span>{member.name} <small>· {member.present ? 'in' : 'out'}</small></span><small>{member.completed}/{member.assigned}</small></div>
                                <progress value={member.completed} max={member.assigned || 1} aria-label={`${member.name} tasks completed`} />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="dashboard-panel-muted">{loading ? 'Loading team…' : team ? 'No active team members.' : 'Team data unavailable.'}</p>}
        </section>
    );
}

export default function DashboardActivity({ stats, loading, period = 'month' }) {
    const navigate = useNavigate();
    return (
        <>
            <MonthlyRatios overview={stats?.overview} salesTarget={stats?.salesTarget} loading={loading} navigate={navigate} />
            <div className="dashboard-activity">
                <Today followUps={stats?.followUps} loading={loading} navigate={navigate} />
                <Pipeline stats={stats} loading={loading} period={period} navigate={navigate} />
                <Revenue records={stats?.collections?.revenue} loading={loading} navigate={navigate} />
                <Team team={stats?.overview?.team} loading={loading} navigate={navigate} />
            </div>
        </>
    );
}
