import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Pencil, Trash2, Building, Mail, Phone, MapPin, Landmark, X } from 'lucide-react';

export default function VendorManagement() {
    const [vendors, setVendors] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState(null);

    const emptyForm = {
        vendorName: '', companyName: '', contactPerson: '', phone: '', email: '',
        gstNumber: '', panNumber: '', address: '',
        bankName: '', accountNumber: '', ifscCode: '',
        paymentTerms: 'Immediate', openingBalance: 0
    };
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/vendors', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setVendors(res.data);
        } catch (error) {
            console.error("Error fetching vendors", error);
        }
    };

    const handleAddVendor = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`http://localhost:5000/api/vendors/${editId}`, formData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/vendors', formData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            }
            closeModal();
            fetchVendors();
        } catch (error) {
            console.error("Error saving vendor", error);
        }
    };

    const handleEditClick = (vendor) => {
        setEditId(vendor._id);
        setFormData({
            vendorName: vendor.vendorName || '',
            companyName: vendor.companyName || '',
            contactPerson: vendor.contactPerson || '',
            phone: vendor.phone || '',
            email: vendor.email || '',
            gstNumber: vendor.gstNumber || '',
            panNumber: vendor.panNumber || '',
            address: vendor.address || '',
            bankName: vendor.bankName || '',
            accountNumber: vendor.accountNumber || '',
            ifscCode: vendor.ifscCode || '',
            paymentTerms: vendor.paymentTerms || 'Immediate',
            openingBalance: vendor.openingBalance || 0
        });
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setFormData(emptyForm);
        setEditId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vendor?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/vendors/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchVendors();
        } catch (error) {
            console.error("Error deleting vendor", error);
        }
    };

    const filteredVendors = vendors.filter(v => 
        v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (v.companyName && v.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search vendors..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-sm"
                    />
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus size={18} className="mr-2" /> Add Vendor
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <th className="p-4">Vendor</th>
                                <th className="p-4">Contact Info</th>
                                <th className="p-4">Compliance & Bank</th>
                                <th className="p-4">Financials</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVendors.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No vendors found.</td></tr>
                            ) : filteredVendors.map(vendor => (
                                <tr key={vendor._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{vendor.vendorName}</p>
                                        {vendor.companyName && <p className="text-xs text-gray-500 flex items-center mt-1"><Building size={12} className="mr-1" /> {vendor.companyName}</p>}
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{vendor.vendorId}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {vendor.phone && <p className="flex items-center"><Phone size={12} className="mr-2 text-gray-400"/> {vendor.phone}</p>}
                                            {vendor.email && <p className="flex items-center"><Mail size={12} className="mr-2 text-gray-400"/> {vendor.email}</p>}
                                            {vendor.contactPerson && <p className="text-xs mt-1 text-gray-500">Attn: {vendor.contactPerson}</p>}
                                            {vendor.address && <p className="text-xs text-gray-500 mt-2 max-w-[200px] truncate" title={vendor.address}><MapPin size={12} className="inline mr-1"/> {vendor.address}</p>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {vendor.gstNumber && <p><span className="text-gray-400 font-medium">GST:</span> {vendor.gstNumber}</p>}
                                            {vendor.panNumber && <p><span className="text-gray-400 font-medium">PAN:</span> {vendor.panNumber}</p>}
                                            {(vendor.bankName || vendor.accountNumber) && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <p className="text-xs flex items-center text-gray-500 mb-1"><Landmark size={12} className="mr-1"/> Bank Details</p>
                                                    {vendor.bankName && <p className="font-medium text-gray-800">{vendor.bankName}</p>}
                                                    {vendor.accountNumber && <p>A/c: {vendor.accountNumber}</p>}
                                                    {vendor.ifscCode && <p>IFSC: {vendor.ifscCode}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1 text-sm">
                                            <p className="flex justify-between"><span className="text-gray-500 mr-4">Total Purchases:</span> <span className="font-medium text-gray-800">₹{vendor.totalPurchaseAmount}</span></p>
                                            <p className="flex justify-between"><span className="text-gray-500 mr-4">Paid:</span> <span className="font-medium text-green-600">₹{vendor.amountPaid}</span></p>
                                            <p className="flex justify-between border-t border-gray-100 pt-1 mt-1"><span className="text-gray-500 mr-4 font-medium">Payable:</span> <span className="font-bold text-red-600">₹{vendor.amountPayable}</span></p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => handleEditClick(vendor)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={16}/></button>
                                            <button onClick={() => handleDelete(vendor._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Vendor Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-extrabold text-gray-900">{editId ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="addVendorForm" onSubmit={handleAddVendor} className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Vendor Name *</label>
                                            <input required type="text" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Company Name</label>
                                            <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Contact Person</label>
                                            <input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                                            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Compliance & Address */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Compliance & Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">GST Number</label>
                                            <input type="text" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">PAN Number</label>
                                            <input type="text" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Full Address</label>
                                            <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Bank & Financials */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Bank & Financials</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Bank Name</label>
                                            <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Account Number</label>
                                            <input type="text" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">IFSC Code</label>
                                            <input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Opening Balance</label>
                                            <input type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Payment Terms</label>
                                            <select value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                                                <option value="Immediate">Immediate</option>
                                                <option value="15 days">15 days</option>
                                                <option value="30 days">30 days</option>
                                                <option value="45 days">45 days</option>
                                                <option value="60 days">60 days</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                            <button onClick={closeModal} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                            <button type="submit" form="addVendorForm" className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">{editId ? 'Update Vendor' : 'Save Vendor'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
