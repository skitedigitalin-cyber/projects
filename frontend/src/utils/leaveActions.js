import axios from 'axios';

export function updateLeaveStatus(id, status) {
    return axios.put(`http://localhost:5000/api/hr/leaves/${id}/status`, {
        status,
        managerComments: status === 'Approved' ? 'Approved by HR' : 'Rejected by HR',
    }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
}
