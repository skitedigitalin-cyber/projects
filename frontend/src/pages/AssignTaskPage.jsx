import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import WorkspaceEditor from '../components/WorkspaceEditor';
import './HREditors.css';

export default function AssignTaskPage({ onAssigned } = {}) {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [employeeId, setEmployeeId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/hr/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/hr/tasks', {
                employeeId,
                title,
                description,
                priority,
                dueDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onAssigned) {
                setEmployeeId('');
                setTitle('');
                setDescription('');
                setPriority('Normal');
                setDueDate('');
                onAssigned();
            } else {
                navigate('/hr');
            }
        } catch (error) {
            console.error('Error assigning task:', error);
            alert(error.response?.data?.message || 'Failed to assign task');
        } finally {
            setSaving(false);
        }
    };

    const form = loading ? <p role="status">Loading employees…</p> : (
        <form id="taskForm" onSubmit={handleSubmit} className={onAssigned ? "hr-task-inline-form" : "lead-editor-form"}>
                    <section className="lead-editor-card" aria-labelledby="task-details-title">
                        <h2 id="task-details-title">Task details</h2>
                        <div className="lead-field-grid">
                            <label className="lead-field-wide">Assign to employee<select required name="employeeId" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
                                <option value="">Select employee</option>
                                {employees.map(employee => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName} · {employee.designation || employee.department || "Staff"}</option>)}
                            </select></label>
                            <label className="lead-field-wide">Task title<input required name="title" value={title} onChange={event => setTitle(event.target.value)} /></label>
                            <label className="lead-field-wide">Description<textarea name="description" value={description} onChange={event => setDescription(event.target.value)} rows="4" /></label>
                        </div>
                    </section>
                    <aside className="lead-followup">
                        <section className="lead-editor-card hr-task-timing" aria-labelledby="task-timing-title">
                            <h2 id="task-timing-title">Priority and due date</h2>
                            <label>Priority<select name="priority" value={priority} onChange={event => setPriority(event.target.value)}>
                                {["High", "Normal", "Low"].map(value => <option key={value}>{value}</option>)}
                            </select></label>
                            <label>Due date<input type="date" name="dueDate" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
                        </section>
                    </aside>
                    {onAssigned && <button type="submit" className="hr-task-submit" disabled={saving}>{saving ? 'Assigning…' : 'Assign task'}</button>}
        </form>
    );

    if (onAssigned) return <section className="hr-view-panel hr-task-inline"><h2>Assign a task</h2>{form}</section>;

    return (
        <WorkspaceEditor backTo="/hr" backLabel="Attendance & HR" label="Team tasks" title="Assign new task"
            formId="taskForm" saveLabel={saving ? 'Assigning…' : 'Assign task'} disabled={saving || loading}>
            {form}
        </WorkspaceEditor>
    );
}
