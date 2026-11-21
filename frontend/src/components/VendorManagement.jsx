import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import './FinanceLedger.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function VendorManagement() {
    const [vendors, setVendors] = useState([]);
    const [editorOpen, setEditorOpen] = useState(true);
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
            closeEditor();
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
        revealEditor();
    };

    const revealEditor = () => {
        setEditorOpen(true);
        requestAnimationFrame(() => document.getElementById('vendor-editor-title')?.focus());
    };

    const closeEditor = () => {
        setEditorOpen(false);
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

    const fields = [
        ['Basic', [['vendorName', 'Vendor name', 'text', true], ['companyName', 'Company name'], ['contactPerson', 'Contact person'],
            ['phone', 'Phone', 'tel'], ['email', 'Email', 'email']]],
        ['Compliance', [['gstNumber', 'GST number'], ['panNumber', 'PAN number'], ['address', 'Full address', 'textarea']]],
        ['Bank & terms', [['bankName', 'Bank name'], ['accountNumber', 'Account number'], ['ifscCode', 'IFSC code'], ['openingBalance', 'Opening balance (₹)', 'number']]],
    ];

    return (
        <div className="finance-ledger" data-editor-open={editorOpen}>
            <section className="finance-ledger-list" aria-labelledby="vendor-list-title">
                <header className="finance-ledger-heading">
                    <div><h2 id="vendor-list-title">Vendors</h2><p>{vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'} · {money.format(vendors.reduce((sum, vendor) => sum + (Number(vendor.amountPayable) || 0), 0))} payable</p></div>
                    <button type="button" className="finance-ledger-primary" onClick={revealEditor}><Plus size={15} /> Add vendor</button>
                </header>
                <label className="finance-ledger-search"><Search size={16} aria-hidden="true" />
                    <input type="search" aria-label="Search vendors" placeholder="Search vendors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </label>
                <ul className="finance-vendor-list">
                    {filteredVendors.map(vendor => (
                        <li key={vendor._id}>
                            <div>
                                <strong>{vendor.vendorName}</strong>
                                <small>{[vendor.companyName, vendor.vendorId, vendor.paymentTerms].filter(Boolean).join(' · ')}</small>
                                <small>{[vendor.contactPerson && `Attn: ${vendor.contactPerson}`, vendor.phone, vendor.email, vendor.address].filter(Boolean).join(' · ')}</small>
                                <small>{[vendor.gstNumber && `GST ${vendor.gstNumber}`, vendor.panNumber && `PAN ${vendor.panNumber}`,
                                    vendor.bankName, vendor.accountNumber && `A/c ${vendor.accountNumber}`, vendor.ifscCode && `IFSC ${vendor.ifscCode}`].filter(Boolean).join(' · ')}</small>
                            </div>
                            <div className="finance-vendor-totals">
                                <small>Purchases</small><strong>{money.format(Number(vendor.totalPurchaseAmount) || 0)}</strong>
                                <small>Paid {money.format(Number(vendor.amountPaid) || 0)} · Payable {money.format(Number(vendor.amountPayable) || 0)}</small>
                                <div className="finance-ledger-row-actions">
                                    <button type="button" onClick={() => handleEditClick(vendor)} aria-label={`Edit ${vendor.vendorName}`}><Pencil size={15} /></button>
                                    <button type="button" onClick={() => handleDelete(vendor._id)} aria-label={`Delete ${vendor.vendorName}`}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        </li>
                    ))}
                    {!filteredVendors.length && <li className="finance-ledger-empty">No vendors found.</li>}
                </ul>
            </section>

            {editorOpen && <section className="finance-ledger-editor" aria-labelledby="vendor-editor-title">
                <h2 id="vendor-editor-title" tabIndex={-1}>{editId ? 'Edit vendor' : 'Add vendor'}</h2>
                <form onSubmit={handleAddVendor} id="addVendorForm">
                    {fields.map(([section, inputs]) => (
                        <fieldset key={section}>
                            <legend>{section}</legend>
                            {inputs.map(([key, label, type = 'text', required = false]) => (
                                <label key={key}>{label}
                                    {type === 'textarea'
                                        ? <textarea name={key} rows={2} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
                                        : <input name={key} type={type} required={required} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />}
                                </label>
                            ))}
                        </fieldset>
                    ))}
                    <label>Payment terms
                        <select value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}>
                            {['Immediate', '15 days', '30 days', '45 days', '60 days'].map(term => <option key={term}>{term}</option>)}
                        </select>
                    </label>
                    <footer><button type="button" onClick={closeEditor}>Cancel</button><button type="submit" className="finance-ledger-primary">{editId ? 'Update vendor' : 'Save vendor'}</button></footer>
                </form>
            </section>}
        </div>
    );
}
