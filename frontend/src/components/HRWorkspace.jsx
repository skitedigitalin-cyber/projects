import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import axios from 'axios';
import { updateLeaveStatus } from '../utils/leaveActions';

const dayFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });
const fullName = employee => [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || 'Employee';
const present = record => ['Present', 'Half Day', 'WFH'].includes(record?.status);

function chartStatus(record) {
    if (present(record)) return record.isLate ? 'Late' : record.status === 'Half Day' ? 'Half day' : 'Present';
    if (['Absent', 'On Leave'].includes(record?.status)) return 'Leave / absent';
    return 'Off / no record';
}

export function HRWorkspaceHeading({ summary, title }) {
    return (
        <header className="hr-workspace-heading">
            <div>
                <p>Attendance &amp; HR</p>
                <h1>{title || (summary ? <>{summary.present} of {summary.staff} in today <span>· {summary.pending} leave {summary.pending === 1 ? 'request' : 'requests'}</span></> : 'Attendance & HR')}</h1>
            </div>
            <div className="hr-workspace-actions">
                <Link to="/hr/assign-task">Assign task</Link>
                <Link to="/hr/employee/add"><Plus size={15} /> Add employee</Link>
            </div>
        </header>
    );
}

export default function HRWorkspace({ onSummaryChange, onViewLeaves, onViewAttendance }) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [updating, setUpdating] = useState(null);
    const [updateError, setUpdateError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        setFailed(false);
        axios.get('http://localhost:5000/api/hr/workspace', {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }).then(({ data: response }) => setData(response)).catch(() => {
            if (!controller.signal.aborted) setFailed(true);
        });
        return () => controller.abort();
    }, [refresh]);

    const byEmployee = useMemo(() => {
        const staff = new Map();
        for (const row of data?.records || []) {
            const key = dayFormat.format(new Date(row.date || row.checkInTime));
            const days = staff.get(row.employeeId) || new Map();
            if (!days.has(key)) days.set(key, row);
            staff.set(row.employeeId, days);
        }
        return staff;
    }, [data]);

    const inToday = data?.staff.filter(employee => present(byEmployee.get(employee._id)?.get(data.today))).length;
    useEffect(() => {
        if (data) onSummaryChange({ present: inToday, staff: data.staff.length, pending: data.pendingLeaves });
    }, [data, inToday, onSummaryChange]);

    const decide = async (leave, status) => {
        setUpdating(leave._id);
        setUpdateError('');
        try {
            await updateLeaveStatus(leave._id, status);
            setData(previous => ({
                ...previous,
                leaves: previous.leaves.filter(row => row._id !== leave._id),
                pendingLeaves: Math.max(0, previous.pendingLeaves - 1),
            }));
            setRefresh(value => value + 1);
        } catch (error) {
            setUpdateError(error.response?.data?.message || 'Could not update the leave request.');
        } finally {
            setUpdating(null);
        }
    };

    if (!data) return <p className="hr-workspace-card" role={failed ? 'alert' : 'status'}>{failed ? 'The HR overview could not be loaded.' : 'Loading attendance and leave requests…'}</p>;

    const month = data.today.slice(0, 7);
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const days = Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);

    return (
        <div className="hr-reference">
            <div className="hr-reference-top">
                <section className="hr-workspace-card" aria-labelledby="hr-today-title">
                    <header><h2 id="hr-today-title">Today</h2><button type="button" onClick={onViewAttendance}>Attendance →</button></header>
                    {data.staff.length ? <ul className="hr-today-list workspace-scroll-list">{data.staff.map(employee => {
                        const row = byEmployee.get(employee._id)?.get(data.today);
                        const isPresent = present(row);
                        const when = row?.checkInTime ? clock.format(new Date(row.checkInTime)) : '';
                        return (
                            <li key={employee._id}>
                                <span className="hr-avatar" aria-hidden="true">{fullName(employee).split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
                                <div><strong>{fullName(employee)}</strong><small>{employee.designation || employee.department}</small></div>
                                <span className="hr-status" data-late={isPresent && row.isLate}>{isPresent ? `${row.isLate ? 'Late' : 'In'} ${when}` : row?.status === 'On Leave' ? 'On leave' : 'Not in'}</span>
                            </li>
                        );
                    })}</ul> : <p>No active employees.</p>}
                </section>
                <section className="hr-workspace-card" aria-labelledby="hr-leaves-title">
                    <header><h2 id="hr-leaves-title">Leave requests</h2><button type="button" onClick={onViewLeaves}>View all →</button></header>
                    {updateError && <p className="hr-error" role="alert">{updateError}</p>}
                    {data.leaves.length ? <ul className="hr-leave-list workspace-scroll-list">{data.leaves.map(leave => (
                        <li key={leave._id}>
                            <div><strong>{fullName(leave.employeeId)}</strong>
                                <time dateTime={leave.startDate}>{shortDate.format(new Date(leave.startDate))}{leave.endDate !== leave.startDate ? ` – ${shortDate.format(new Date(leave.endDate || leave.startDate))}` : ''}</time>
                            </div>
                            <p>{leave.leaveType}{leave.reason && ` · ${leave.reason}`}</p>
                            <div>
                                <button type="button" disabled={!!updating} onClick={() => decide(leave, 'Approved')}>Approve</button>
                                <button type="button" disabled={!!updating} onClick={() => decide(leave, 'Rejected')}>Decline</button>
                            </div>
                        </li>
                    ))}</ul> : <p>No pending leave requests.</p>}
                </section>
            </div>
            <section className="hr-workspace-card hr-month" aria-labelledby="hr-month-title">
                <header>
                    <h2 id="hr-month-title">{monthName.format(new Date(`${month}-01T00:00:00Z`))} attendance</h2>
                    <ul className="hr-legend">{['Present', 'Late', 'Half day', 'Leave / absent', 'Off / no record'].map(status => <li key={status}><i data-status={status} />{status}</li>)}</ul>
                </header>
                {data.staff.length ? <div className="hr-month-scroll workspace-table-scroll" role="region" aria-labelledby="hr-month-title" tabIndex={0}>
                    <table>
                        <colgroup><col className="hr-month-employee" /><col span={days.length} /><col className="hr-month-rate" /></colgroup>
                        <thead className="sr-only"><tr><th scope="col">Employee</th>{days.map((date, index) => <th key={date} scope="col">{index + 1}</th>)}<th scope="col">Attendance rate</th></tr></thead>
                        <tbody>{data.staff.map(employee => {
                            const records = byEmployee.get(employee._id);
                            const working = [...(records?.values() || [])].filter(record => present(record) || record.status === 'Absent');
                            const rate = working.length ? Math.round(working.reduce((sum, record) => sum + (record.status === 'Half Day' ? .5 : Number(present(record))), 0) / working.length * 100) : null;
                            return (
                                <tr key={employee._id}>
                                    <th scope="row">{employee.firstName}</th>
                                    {days.map(date => {
                                        const status = chartStatus(records?.get(date));
                                        return <td key={date} title={`${date} · ${status}`} aria-label={status}><i data-status={status} aria-hidden="true" /></td>;
                                    })}
                                    <td>{rate == null ? '—' : `${rate}%`}</td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                </div> : <p>No attendance records to display.</p>}
            </section>
        </div>
    );
}
