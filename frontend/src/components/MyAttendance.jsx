import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Calendar, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MyAttendance() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hr/attendance/my-records', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setRecords(res.data);
            } catch (error) {
                console.error("Error fetching my attendance", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, []);

    const totalPages = Math.ceil(records.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedRecords = records.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading attendance records...</div>;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-semibold text-gray-800 flex items-center">
                    <Calendar size={18} className="mr-2 text-gray-500" /> My Attendance History
                </h3>
            </div>
            
            <div className="p-0 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Daily Report</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No attendance records found.</td>
                            </tr>
                        ) : (
                            paginatedRecords.map((record) => (
                                <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {new Date(record.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                            record.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            record.status === 'Half Day' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        {record.totalWorkingMinutes ? `${Math.floor(record.totalWorkingMinutes / 60)}h ${record.totalWorkingMinutes % 60}m` : '--'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={record.notes}>
                                        {record.notes || '--'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {records.length > PAGE_SIZE && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
                    <span className="text-xs font-semibold text-gray-500">
                        Showing <strong className="text-gray-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-gray-800">{Math.min(validPage * PAGE_SIZE, records.length)}</strong> of <strong className="text-gray-800">{records.length}</strong> records
                    </span>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={validPage <= 1}
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-600">
                            Page {validPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={validPage >= totalPages}
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
