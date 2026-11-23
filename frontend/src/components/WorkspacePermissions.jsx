import { useEffect, useState } from 'react';
import axios from 'axios';

const modules = [['sales', 'Sales'], ['finance', 'Finance'], ['hr', 'HR'], ['calendar', 'Calendar'], ['projects', 'Team']];
const endpoint = 'http://localhost:5000/api/auth/workspace-access';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function WorkspacePermissions() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busyUser, setBusyUser] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { headers: headers(), signal: controller.signal })
            .then(({ data: result }) => setData(result))
            .catch(error => { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Module access could not be loaded.'); });
        return () => controller.abort();
    }, []);

    const toggle = async (employee, module, label, enabled) => {
        setBusyUser(employee.id);
        setError('');
        setStatus('');
        try {
            const { data: result } = await axios.patch(`${endpoint}/${employee.id}`, { module, enabled }, { headers: headers() });
            setData(previous => ({
                ...previous, employees: previous.employees.map(row => row.id === employee.id ? { ...row, activeModules: result.activeModules } : row),
            }));
            setStatus(`${label} access ${enabled ? 'enabled' : 'disabled'} for ${employee.name}.`);
        } catch (error) {
            setError(error.response?.data?.message || 'Module access could not be updated.');
        } finally {
            setBusyUser('');
        }
    };

    return (
        <div className="workspace-permissions">
            <section className="workspace-settings-card" aria-labelledby="module-access-title">
                <header><h2 id="module-access-title">Module access</h2>
                    {data && <span>{data.seatLimit == null ? `${data.seatsUsed} seats used` : `${data.seatsUsed} of ${data.seatLimit} seats used`}</span>}
                </header>
                {error && <p className="workspace-settings-error" role="alert">{error}</p>}
                <p className="sr-only" role="status">{status}</p>
                {data?.employees.length ? (
                    <div className="workspace-permissions-scroll">
                        <table>
                            <thead><tr><th scope="col">Employee</th>{modules.map(([module, label]) => <th key={module} scope="col">{label}</th>)}</tr></thead>
                            <tbody>{data.employees.map(employee => (
                                <tr key={employee.id}>
                                    <th scope="row"><span>{employee.name}</span><small>{employee.designation}</small></th>
                                    {modules.map(([module, label]) => {
                                        const enabled = employee.activeModules.includes(module);
                                        return (
                                            <td key={module}><button type="button" role="switch" aria-checked={enabled}
                                                aria-label={`${label} access for ${employee.name}`} disabled={!!busyUser}
                                                onClick={() => toggle(employee, module, label, !enabled)}><span /></button></td>
                                        );
                                    })}
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : !error && <p>{data ? 'No active employee accounts to configure.' : 'Loading module access…'}</p>}
            </section>
        </div>
    );
}
