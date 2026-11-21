import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { updateLeaveStatus } from '../utils/leaveActions';
import { Search } from 'lucide-react';
import './HRViews.css';

const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function LeaveManagement() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination (10 records per page)
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLeaves = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/hr/leaves', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLeaves(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching leaves", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const updateStatus = async (id, status) => {
        setUpdatingId(id);
        try {
            await updateLeaveStatus(id, status);
            await fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update leave status");
        } finally {
            setUpdatingId(null);
        }
    };

    // Metric counts
    const pendingCount = useMemo(() => leaves.filter(l => l.status === 'Pending').length, [leaves]);
    const approvedCount = useMemo(() => leaves.filter(l => l.status === 'Approved').length, [leaves]);
    const rejectedCount = useMemo(() => leaves.filter(l => l.status === 'Rejected').length, [leaves]);

    // Filtering logic
    const filteredLeaves = useMemo(() => {
        return leaves.filter(leave => {
            // Status filter
            if (statusFilter !== 'all' && leave.status !== statusFilter) {
                return false;
            }

            // Date range filter
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                const lStart = new Date(leave.startDate);
                lStart.setHours(0, 0, 0, 0);
                if (lStart < sDate) return false;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                const lEnd = new Date(leave.endDate || leave.startDate);
                if (lEnd > eDate) return false;
            }

            // Search filter
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            const fName = `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.toLowerCase();
            const empId = (leave.employeeId?.employeeId || '').toLowerCase();
            const dept = (leave.employeeId?.department || '').toLowerCase();
            const lType = (leave.leaveType || '').toLowerCase();
            const reason = (leave.reason || '').toLowerCase();
            const status = (leave.status || '').toLowerCase();

            return fName.includes(term) || empId.includes(term) || dept.includes(term) || lType.includes(term) || reason.includes(term) || status.includes(term);
        });
    }, [leaves, searchTerm, statusFilter, startDate, endDate]);

    // Reset page to 1 whenever search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLeaves.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedLeaves = filteredLeaves.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    if (loading) return <p role="status">Loading leave requests…</p>;

    const states = [['all', 'All requests', leaves.length], ['Pending', 'Pending', pendingCount],
        ['Approved', 'Approved', approvedCount], ['Rejected', 'Declined', rejectedCount]];

    return (
        <div className="hr-views-stack">
            <div className="hr-metrics-summary hr-leave-filters" role="group" aria-label="Leave status">
                {states.map(([value, label, count]) => (
                    <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
                        <span>{label}</span><strong>{count}</strong>
                    </button>
                ))}
            </div>
            <section className="hr-view-panel" aria-labelledby="hr-leave-records-title">
                <header>
                    <h2 id="hr-leave-records-title">{states.find(([value]) => value === statusFilter)?.[1]}</h2>
                    <div className="hr-view-controls">
                        <label><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search leaves" placeholder="Search leaves" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></label>
                        <label>From<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
                        <label>To<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
                        {(searchTerm || startDate || endDate || statusFilter !== 'all') && <button type="button" onClick={() => {
                            setSearchTerm(''); setStartDate(''); setEndDate(''); setStatusFilter('all');
                        }}>Clear filters</button>}
                    </div>
                </header>
                <div className="hr-view-table">
                    <table>
                        <thead><tr>{['Employee','Type','Dates','Reason','Status','Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                        <tbody>
                            {paginatedLeaves.map(leave => {
                                const employee = leave.employeeId;
                                const name = [employee?.firstName,employee?.lastName].filter(Boolean).join(' ') || 'Unknown employee';
                                const start = new Date(leave.startDate);
                                const end = new Date(leave.endDate || leave.startDate);
                                const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
                                const busy = updatingId === leave._id;
                                return <tr key={leave._id}>
                                    <th scope="row"><div className="hr-leave-person">
                                        <span className="hr-avatar" aria-hidden="true">{name.split(' ').map(part => part[0]).slice(0,2).join('')}</span>
                                        <div>{name}<small>{[employee?.employeeId,employee?.department].filter(Boolean).join(' · ')}</small></div>
                                    </div></th>
                                    <td>{leave.leaveType}</td>
                                    <td>{dateLabel.format(start)}{start.getTime() !== end.getTime() ? ` – ${dateLabel.format(end)}` : ''}<small>{days} {days === 1 ? 'day' : 'days'}</small></td>
                                    <td>{leave.reason}</td>
                                    <td><span className="hr-leave-state" data-status={leave.status}>{leave.status}</span></td>
                                    <td><div className="hr-view-controls">
                                        {leave.status !== 'Approved' && <button type="button" className="hr-view-primary" disabled={busy} onClick={() => updateStatus(leave._id, 'Approved')}>{leave.status === 'Pending' ? 'Approve' : 'Re-approve'}</button>}
                                        {leave.status !== 'Rejected' && <button type="button" disabled={busy} onClick={() => updateStatus(leave._id, 'Rejected')}>{leave.status === 'Pending' ? 'Decline' : 'Revoke'}</button>}
                                    </div></td>
                                </tr>;
                            })}
                            {!paginatedLeaves.length && <tr><td colSpan={6}>No leave requests match these filters.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <footer className="hr-view-controls hr-view-pagination">
                    <span>Page {validPage} of {totalPages}</span>
                    <button type="button" disabled={validPage <= 1} onClick={() => setCurrentPage(validPage - 1)}>Previous</button>
                    <button type="button" disabled={validPage >= totalPages} onClick={() => setCurrentPage(validPage + 1)}>Next</button>
                </footer>}
            </section>
        </div>
    );
}
