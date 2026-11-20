import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, ShoppingCart, Download, Trash2, X, FilePlus, Pencil } from 'lucide-react';

export default function PurchaseManagement() {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState(null);

    // Form States
    const [vendorId, setVendorId] = useState('');
    const [purchaseBillNumber, setPurchaseBillNumber] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([{ itemName: '', quantity: 1, rate: 0, amount: 0 }]);
    const [discount, setDiscount] = useState(0);
    const [taxGstAmount, setTaxGstAmount] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState('Unpaid');
    const [notes, setNotes] = useState('');

    // Totals
    const [subtotal, setSubtotal] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    useEffect(() => {
        fetchPurchases();
        fetchVendors();
    }, []);

    useEffect(() => {
        const newSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        setSubtotal(newSubtotal);
        setGrandTotal(newSubtotal - Number(discount || 0) + Number(taxGstAmount || 0));
    }, [items, discount, taxGstAmount]);

    const fetchPurchases = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/purchases', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setPurchases(res.data);
        } catch (error) {
            console.error("Error fetching purchases", error);
        }
    };

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

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        if (field === 'quantity' || field === 'rate') {
            const qty = Number(newItems[index].quantity) || 0;
            const rt = Number(newItems[index].rate) || 0;
            newItems[index].amount = qty * rt;
        }
        
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { itemName: '', quantity: 1, rate: 0, amount: 0 }]);
    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSavePurchase = async (e) => {
        e.preventDefault();
        if (!vendorId) return alert('Please select a vendor.');
        if (!purchaseBillNumber) return alert('Please provide the vendor bill number.');
        if (items.some(i => !i.itemName)) return alert('Please enter item names for all rows.');

        const payload = {
            vendorId,
            purchaseBillNumber,
            billDate,
            dueDate,
            items,
            subtotal,
            discount,
            taxGstAmount,
            grandTotal,
            paymentStatus,
            notes
        };

        try {
            if (editId) {
                await axios.put(`http://localhost:5000/api/purchases/${editId}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/purchases', payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            }
            setIsAddModalOpen(false);
            resetForm();
            fetchPurchases();
        } catch (error) {
            console.error("Error saving purchase", error);
            alert("Error saving purchase");
        }
    };

    const handleEditClick = (p) => {
        setEditId(p._id);
        setVendorId(p.vendorId?._id || p.vendorId || '');
        setPurchaseBillNumber(p.purchaseBillNumber || '');
        setBillDate(p.billDate ? new Date(p.billDate).toISOString().split('T')[0] : '');
        setDueDate(p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '');
        setItems(p.items && p.items.length > 0 ? p.items : [{ itemName: '', quantity: 1, rate: 0, amount: 0 }]);
        setDiscount(p.discount || 0);
        setTaxGstAmount(p.taxGstAmount || 0);
        setPaymentStatus(p.paymentStatus || 'Unpaid');
        setNotes(p.notes || '');
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this purchase bill?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/purchases/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchPurchases();
        } catch (error) {
            console.error("Error deleting purchase", error);
        }
    };

    const resetForm = () => {
        setEditId(null);
        setVendorId('');
        setPurchaseBillNumber('');
        setBillDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setItems([{ itemName: '', quantity: 1, rate: 0, amount: 0 }]);
        setDiscount(0);
        setTaxGstAmount(0);
        setPaymentStatus('Unpaid');
        setNotes('');
    };

    const filteredPurchases = purchases.filter(p => 
        p.internalId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.purchaseBillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.vendorId?.vendorName && p.vendorId.vendorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8">
            {/* Header & Search */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search purchases by vendor or bill #..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-sm"
                    />
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus size={18} className="mr-2" /> Log Purchase Bill
                </button>
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <th className="p-4">Internal ID</th>
                                <th className="p-4">Vendor Bill #</th>
                                <th className="p-4">Vendor</th>
                                <th className="p-4">Bill Date</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPurchases.length === 0 ? (
                                <tr><td colSpan="7" className="p-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <ShoppingCart size={48} className="text-gray-300 mb-4" />
                                        <p className="text-lg font-medium text-gray-900">No purchases found</p>
                                        <p className="text-sm">Log your first vendor purchase bill.</p>
                                    </div>
                                </td></tr>
                            ) : filteredPurchases.map(p => (
                                <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">{p.internalId}</td>
                                    <td className="p-4 text-gray-600">{p.purchaseBillNumber}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{p.vendorId?.vendorName || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{p.vendorId?.companyName}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <p>Bill: {new Date(p.billDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        {p.dueDate && <p className="text-xs text-gray-400">Due: {new Date(p.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                                    </td>
                                    <td className="p-4 font-bold text-gray-900">₹{p.grandTotal}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 
                                            p.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-700' : 
                                            'bg-orange-100 text-orange-700'
                                        }`}>{p.paymentStatus}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => handleEditClick(p)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Purchase"><Pencil size={16}/></button>
                                            <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg transition-colors" title="Delete Purchase"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Purchase Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                        
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center">
                                <FilePlus size={24} className="mr-2 text-blue-600" /> {editId ? 'Edit Vendor Purchase Bill' : 'Log Vendor Purchase Bill'}
                            </h2>
                            <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            <form id="addPurchaseForm" onSubmit={handleSavePurchase} className="space-y-8 max-w-5xl mx-auto">
                                
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-bold text-gray-700 block mb-2">Select Vendor *</label>
                                        <select 
                                            required 
                                            value={vendorId} 
                                            onChange={(e) => setVendorId(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium text-gray-700"
                                        >
                                            <option value="">-- Choose Vendor --</option>
                                            {vendors.map(v => (
                                                <option key={v._id} value={v._id}>{v.vendorName} {v.companyName ? `(${v.companyName})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-2">Vendor Bill # *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={purchaseBillNumber} 
                                            onChange={(e) => setPurchaseBillNumber(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-2">Bill Date *</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={billDate} 
                                            onChange={(e) => setBillDate(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Purchase Items</h3>
                                    
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase px-2">
                                            <div className="col-span-6">Item Description</div>
                                            <div className="col-span-2">Quantity</div>
                                            <div className="col-span-2">Rate (₹)</div>
                                            <div className="col-span-2 text-right pr-8">Amount</div>
                                        </div>
                                        
                                        {items.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-4 items-center group relative bg-gray-50/50 p-2 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                                                <div className="col-span-6">
                                                    <input 
                                                        required 
                                                        type="text" 
                                                        placeholder="Enter item description..."
                                                        value={item.itemName} 
                                                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input 
                                                        required 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input 
                                                        required 
                                                        type="number" 
                                                        min="0"
                                                        value={item.rate} 
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right font-semibold text-gray-700 pr-8">
                                                    ₹{item.amount.toLocaleString()}
                                                </div>
                                                
                                                {items.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="absolute right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        type="button" 
                                        onClick={addItem}
                                        className="mt-4 flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <Plus size={16} className="mr-1" /> Add Another Item
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                        <div className="flex-1">
                                            <label className="text-sm font-bold text-gray-700 block mb-2">Internal Notes</label>
                                            <textarea 
                                                rows="4" 
                                                value={notes} 
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full h-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                                                placeholder="Notes about this purchase..."
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-end">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span className="font-medium">Subtotal</span>
                                                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span className="font-medium">Discount (₹)</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={discount} 
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                    className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded outline-none focus:border-blue-500 text-right"
                                                />
                                            </div>

                                            <div className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-4">
                                                <span className="font-medium">Tax / GST (₹)</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={taxGstAmount} 
                                                    onChange={(e) => setTaxGstAmount(e.target.value)}
                                                    className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded outline-none focus:border-blue-500 text-right"
                                                />
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-lg font-extrabold text-gray-900">Grand Total</span>
                                                <span className="text-2xl font-black text-blue-700">₹{grandTotal.toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="pt-4 flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-700">Payment Status</label>
                                                <select 
                                                    value={paymentStatus} 
                                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                                    className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium text-sm"
                                                >
                                                    <option value="Unpaid">Unpaid</option>
                                                    <option value="Partial">Partial</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end space-x-4">
                            <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="addPurchaseForm" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center">
                                <FilePlus size={18} className="mr-2" /> Log Purchase Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
