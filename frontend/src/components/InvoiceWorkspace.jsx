import { useState } from 'react';
import './InvoiceWorkspace.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' });
const invoiceDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const dateKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const validDate = value => value && Number.isFinite(new Date(value).getTime());
const formatDate = value => validDate(value) ? invoiceDate.format(new Date(value)) : '—';
const number = invoice => invoice.invoiceNumber || invoice.invoiceNo || 'Invoice';
const client = invoice => invoice.customerId?.companyName || invoice.customerId?.customerName || invoice.clientDetails?.name || 'Customer';
const balance = invoice => invoice.paymentStatus === 'Paid' ? 0 : Math.max(0, Number(invoice.grandTotal || 0) - Number(invoice.paidAmount || 0));

function status(invoice, today) {
    if (!balance(invoice)) return 'Paid';
    if (validDate(invoice.dueDate) && dateKey.format(new Date(invoice.dueDate)) < today) return 'Overdue';
    return invoice.paymentStatus === 'Partial' ? 'Partial' : 'Due';
}

function shareLink(invoice) {
    const phone = String(invoice.customerId?.phone || invoice.clientDetails?.phone || '').replace(/\D/g, '');
    const international = phone.length === 10 ? '91' + phone : phone;
    if (international.length < 11 || international.length > 15) return null;
    const message = `Hello ${client(invoice)}, invoice ${number(invoice)} totals ${money.format(invoice.grandTotal || 0)}.`;
    return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export default function InvoiceWorkspace({ invoices, company, loading, failed, downloadingId, onDownload, onRecordPayment }) {
    const [selectedId, setSelectedId] = useState(null);
    const selected = invoices.find(invoice => invoice._id === selectedId) || invoices[0];
    const today = dateKey.format(new Date());
    const overdue = invoices.filter(invoice => status(invoice, today) === 'Overdue').length;
    const whatsapp = selected && shareLink(selected);

    return (
        <div className="invoice-workspace" aria-busy={loading}>
            <section className="invoice-workspace-list" aria-labelledby="invoice-workspace-title">
                <header><h2 id="invoice-workspace-title">Invoices</h2><span>{overdue} overdue</span></header>
                {loading ? <p role="status">Loading invoices…</p> : failed ? <p role="alert">Invoices could not be loaded.</p>
                    : invoices.length ? (
                        <ul className="workspace-scroll-list">
                            {invoices.map(invoice => {
                                const badge = status(invoice, today);
                                return (
                                    <li key={invoice._id}>
                                        <button type="button" aria-pressed={invoice._id === selected?._id} onClick={() => setSelectedId(invoice._id)}>
                                            <span><strong>{client(invoice)}</strong><small>{number(invoice)} · {formatDate(invoice.invoiceDate)}</small></span>
                                            <span><strong>{money.format(invoice.grandTotal || 0)}</strong><small data-status={badge}>{badge}</small></span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p>No invoices yet.</p>}
            </section>
            {selected && (
                <div className="invoice-workspace-selected">
                    <article className="invoice-workspace-paper" aria-label={`Details for ${number(selected)}`}>
                        <header>
                            <div><small>{selected.taxGstAmount > 0 ? 'Tax invoice' : 'Invoice'}</small><h2>{number(selected)}</h2></div>
                            <div><strong>{company.name}</strong>{company.gstNumber && <p>GSTIN {company.gstNumber}</p>}{company.address && <p>{company.address}</p>}</div>
                        </header>
                        <dl className="invoice-workspace-metadata">
                            <div><dt>Billed to</dt><dd>{client(selected)}</dd></div>
                            <div><dt>Issued</dt><dd>{formatDate(selected.invoiceDate)}</dd></div>
                            <div><dt>Due</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                        </dl>
                        <div className="invoice-workspace-table">
                            <table>
                                <thead><tr><th scope="col">Item</th><th scope="col">HSN/SAC</th><th scope="col">Qty</th><th scope="col">Amount</th></tr></thead>
                                <tbody>{selected.items?.map((item, index) => <tr key={item._id || index}><td>{item.itemName || item.description}</td><td>{item.hsnSac || '—'}</td><td>{item.quantity}</td><td>{money.format(item.amount || 0)}</td></tr>)}</tbody>
                            </table>
                        </div>
                        <dl className="invoice-workspace-totals">
                            <div><dt>Subtotal</dt><dd>{money.format(selected.subtotal || 0)}</dd></div>
                            {selected.discount > 0 && <div><dt>Discount</dt><dd>{money.format(selected.discount)}</dd></div>}
                            {selected.taxGstAmount > 0 && <div><dt>GST{selected.taxRate ? ` ${selected.taxRate}%` : ''}</dt><dd>{money.format(selected.taxGstAmount)}</dd></div>}
                            <div><dt>Total</dt><dd>{money.format(selected.grandTotal || 0)}</dd></div>
                        </dl>
                    </article>
                    <div className="invoice-workspace-actions">
                        {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
                        {balance(selected) > 0 && <button type="button" onClick={() => onRecordPayment(selected)}>Record payment</button>}
                        <button type="button" disabled={downloadingId === selected._id} onClick={() => onDownload(selected)}>
                            {downloadingId === selected._id ? 'Preparing…' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
