import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import './FinanceLedger.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function PurchaseManagement() {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [editorOpen, setEditorOpen] = useState(true);
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
            setEditorOpen(false);
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
        revealEditor();
    };

    const revealEditor = () => {
        setEditorOpen(true);
        requestAnimationFrame(() => document.getElementById('purchase-editor-title')?.focus());
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
        <div className="finance-ledger" data-editor-open={editorOpen}>
            <section className="finance-ledger-list" aria-labelledby="purchase-list-title">
                <header className="finance-ledger-heading">
                    <div><h2 id="purchase-list-title">Bills</h2><p>{purchases.length} {purchases.length === 1 ? 'bill' : 'bills'} · {money.format(purchases.reduce((sum, bill) => sum + (Number(bill.grandTotal) || 0), 0))} recorded</p></div>
                    <button type="button" className="finance-ledger-primary" onClick={() => { resetForm(); revealEditor(); }}><Plus size={15} /> Log bill</button>
                </header>
                <label className="finance-ledger-search"><Search size={16} aria-hidden="true" />
                    <input type="search" aria-label="Search purchases" placeholder="Search purchases" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </label>
                <div className="finance-ledger-table">
                    <table>
                        <thead><tr>{['Bill', 'Vendor', 'Dates', 'Amount', 'Status', 'Actions'].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
                        <tbody>
                            {filteredPurchases.map(bill => (
                                <tr key={bill._id}>
                                    <td><strong>{bill.purchaseBillNumber}</strong><small>{bill.internalId}</small></td>
                                    <td>{bill.vendorId?.vendorName || 'Unknown'}<small>{bill.vendorId?.companyName}</small></td>
                                    <td><span>{bill.billDate ? date.format(new Date(bill.billDate)) : '—'}</span>{bill.dueDate && <small>Due {date.format(new Date(bill.dueDate))}</small>}</td>
                                    <td>{money.format(Number(bill.grandTotal) || 0)}</td>
                                    <td><span className="finance-ledger-status" data-status={bill.paymentStatus}>{bill.paymentStatus}</span></td>
                                    <td><div className="finance-ledger-row-actions">
                                        <button type="button" onClick={() => handleEditClick(bill)} aria-label={`Edit purchase ${bill.purchaseBillNumber}`}><Pencil size={15} /></button>
                                        <button type="button" onClick={() => handleDelete(bill._id)} aria-label={`Delete purchase ${bill.purchaseBillNumber}`}><Trash2 size={15} /></button>
                                    </div></td>
                                </tr>
                            ))}
                            {!filteredPurchases.length && <tr><td colSpan={6} className="finance-ledger-empty">No purchases found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {editorOpen && <section className="finance-ledger-editor" aria-labelledby="purchase-editor-title">
                <h2 id="purchase-editor-title" tabIndex={-1}>{editId ? 'Edit vendor bill' : 'Log a vendor bill'}</h2>
                <form id="addPurchaseForm" onSubmit={handleSavePurchase}>
                    <label>Vendor
                        <select name="vendor" required value={vendorId} onChange={e => setVendorId(e.target.value)}>
                            <option value="">Choose vendor</option>
                            {vendors.map(vendor => <option key={vendor._id} value={vendor._id}>{vendor.vendorName}{vendor.companyName ? ` (${vendor.companyName})` : ''}</option>)}
                        </select>
                    </label>
                    <label>Vendor bill #<input name="billNumber" required value={purchaseBillNumber} onChange={e => setPurchaseBillNumber(e.target.value)} /></label>
                    <div className="finance-ledger-fields">
                        <label>Bill date<input type="date" required value={billDate} onChange={e => setBillDate(e.target.value)} /></label>
                        <label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
                    </div>
                    <fieldset>
                        <legend>Items</legend>
                        {items.map((item, index) => (
                            <div key={index} className="finance-purchase-line">
                                <label>Item<input name={`item-${index}`} required value={item.itemName} onChange={e => handleItemChange(index, 'itemName', e.target.value)} /></label>
                                <label>Qty<input type="number" name={`quantity-${index}`} min="1" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} /></label>
                                <label>Rate (₹)<input type="number" name={`rate-${index}`} min="0" required value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} /></label>
                                <span>Amount <strong>{money.format(Number(item.amount) || 0)}</strong></span>
                                {items.length > 1 && <button type="button" onClick={() => removeItem(index)} aria-label={`Remove item ${index + 1}`}><Trash2 size={15} /></button>}
                            </div>
                        ))}
                        <button type="button" onClick={addItem}><Plus size={14} /> Add item</button>
                    </fieldset>
                    <dl className="finance-purchase-totals"><div><dt>Subtotal</dt><dd>{money.format(subtotal)}</dd></div></dl>
                    <div className="finance-ledger-fields">
                        <label>Discount (₹)<input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} /></label>
                        <label>Tax / GST (₹)<input type="number" min="0" value={taxGstAmount} onChange={e => setTaxGstAmount(e.target.value)} /></label>
                    </div>
                    <dl className="finance-purchase-totals"><div><dt>Grand total</dt><dd>{money.format(grandTotal)}</dd></div></dl>
                    <label>Payment status
                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                            {['Unpaid','Partial','Paid'].map(status => <option key={status}>{status}</option>)}
                        </select>
                    </label>
                    <label>Internal notes<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></label>
                    <footer>
                        <button type="button" onClick={() => setEditorOpen(false)}>Cancel</button>
                        <button type="submit" className="finance-ledger-primary">{editId ? 'Update bill' : 'Save bill'}</button>
                    </footer>
                </form>
            </section>}
        </div>
    );
}
