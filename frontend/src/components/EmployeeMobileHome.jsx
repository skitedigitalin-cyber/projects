import { ArrowUpRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import './WorkspaceLayout.css';
import './EmployeeMobileHome.css';

const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default function EmployeeMobileHome({
    name, now, attendance, shift, pendingPrevious, duration, taskSummary, followUps, salesEnabled,
    loading, multiShift, onOpenProfile, onCheckIn, onCheckOut, onMissedCheckOut
}) {
    const firstName = name?.trim().split(/\s+/)[0];
    const initials = name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'ME';
    const status = pendingPrevious ? 'Missed check-out' : attendance?.checkOutTime ? 'Shift complete' : attendance?.checkInTime ? 'Checked in' : 'Not checked in';
    const count = followUps?.followUpCount;
    const headline = count != null ? `${count} ${count === 1 ? 'call' : 'calls'} due.` : `${taskSummary.total} ${taskSummary.total === 1 ? 'task' : 'tasks'} today.`;
    const phoneLink = number => {
        const phone = String(number ?? '').replace(/[^+\d]/g, '');
        return /\d/.test(phone) ? `tel:${phone}` : null;
    };

    return (
        <div className="employee-mobile-home">
            <header>
                <div>
                    <time dateTime={now.toISOString()}>{day.format(now).replace(',', ' ·')}</time>
                    <h1>Hi{firstName ? ` ${firstName}` : ''}. <span>{headline}</span></h1>
                </div>
                <button type="button" className="employee-avatar" aria-label="Open employee menu" onClick={onOpenProfile}>{initials}</button>
            </header>
            <section className="employee-shift">
                <p>{status}<span aria-hidden="true" /></p>
                <h2>{pendingPrevious ? 'Previous shift' : attendance?.checkOutTime ? `Out at ${time.format(new Date(attendance.checkOutTime))}` : attendance?.checkInTime ? duration : `${shift || 'Today’s'} shift`}</h2>
                {pendingPrevious ? <button type="button" onClick={onMissedCheckOut}>Complete missed check-out</button>
                    : attendance?.checkOutTime ? (multiShift && <button type="button" onClick={onCheckIn}>Start another shift</button>)
                    : attendance?.checkInTime ? <button type="button" onClick={onCheckOut}>Check out</button>
                    : <button type="button" onClick={onCheckIn} disabled={loading}>Check in</button>}
            </section>
            <div className="employee-home-kpis">
                <section>
                    <h2>Tasks today</h2>
                    <strong>{taskSummary.completed}<span>/{taskSummary.total}</span></strong>
                    <progress value={taskSummary.completed} max={taskSummary.total || 1} aria-label="Tasks completed today" />
                </section>
                <section>
                    <h2>Overdue {salesEnabled ? 'calls' : 'tasks'}</h2>
                    <strong className="employee-overdue">{salesEnabled ? followUps?.overdueFollowUpCount ?? '—' : taskSummary.overdue}</strong>
                    <small>{salesEnabled ? 'Call back first' : 'Due before today'}</small>
                </section>
            </div>
            {salesEnabled && (
                <section className="employee-followups">
                    <h2>Follow-ups</h2>
                    {followUps?.followUps?.length ? (
                        <ul>
                            {followUps.followUps.map(item => {
                                const phone = phoneLink(item.phone);
                                return (
                                    <li key={item.id}>
                                        <time className={item.overdue ? 'employee-overdue' : undefined} dateTime={item.date}>{item.overdue ? 'Overdue' : time.format(new Date(item.date))}</time>
                                        <Link to={`/sales/lead/edit/${item.id}`}>{item.name}</Link>
                                        {phone
                                            ? <a className="employee-call" href={phone} aria-label={`Call ${item.name}`}><Phone size={17} /></a>
                                            : <Link className="employee-call" to={`/sales/lead/edit/${item.id}`} aria-label={`Open ${item.name}`}><ArrowUpRight size={17} /></Link>}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p>{followUps ? 'No follow-ups due today.' : 'Follow-ups are currently unavailable.'}</p>}
                </section>
            )}
        </div>
    );
}
