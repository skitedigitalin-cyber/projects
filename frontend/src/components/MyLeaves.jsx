import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MyLeaves() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hr/leaves/my-leaves', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setLeaves(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error("Error fetching my leaves", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaves();
    }, []);

    const totalPages = Math.ceil(leaves.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedLeaves = leaves.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading leave records...</div>;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-semibold text-gray-800 flex items-center">
                    <Calendar size={18} className="mr-2 text-gray-500" /> Leave Requests History
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Total: {leaves.length}
                </span>
            </div>
            
            <div className="p-0 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leaves.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No leave requests found.</td>
                            </tr>
                        ) : (
                            paginatedLeaves.map((leave) => (
                                <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {leave.leaveType}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            leave.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={leave.reason}>
                                        {leave.reason}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {leaves.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
                    <span className="text-xs font-semibold text-slate-500">
                        Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, leaves.length)}</strong> of <strong className="text-slate-900">{leaves.length}</strong> requests
                    </span>
                    <div className="flex items-center space-x-2">
                        <button 
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={validPage <= 1}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs font-mono">
                            {validPage} / {totalPages}
                        </span>
                        <button 
                            type="button"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={validPage >= totalPages}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
