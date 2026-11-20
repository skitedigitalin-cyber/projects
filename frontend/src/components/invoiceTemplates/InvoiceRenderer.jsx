import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Building2, Phone, Mail, MapPin } from 'lucide-react';

export default function InvoiceRenderer({ 
    invoice, 
    templateId = 'skite-orange', 
    customColor = null,
    company = {
        name: '',
        address: '',
        email: '',
        website: '',
        phone: '',
        gstNumber: '',
        panNumber: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        logo: '',
        sign: '',
        seal: '',
        invoiceColor: '',
        templateColors: {}
    },
    innerRef = null
}) {
    if (!invoice) return null;

    const defaultTemplateColors = {
        'skite-orange': '#FF4500',
        'modern-minimal': '#0f172a',
        'classic-corporate': '#0c2340',
        'emerald-tech': '#059669',
        'creative-studio': '#7c3aed',
        'executive-slate': '#334155',
        'compact-grid': '#475569',
        'elegant-serif': '#78350f',
        'bold-industrial': '#000000',
        'aurora-gradient': '#06b6d4',
        'gst-tax-standard': '#2563eb'
    };

    // Active accent color prioritized from customColor -> per-template -> saved tenant color -> localStorage -> default
    const activeColor = customColor 
        || (company?.templateColors && company.templateColors[templateId])
        || company?.invoiceColor 
        || (typeof window !== 'undefined' ? localStorage.getItem('selected-invoice-color') : null) 
        || defaultTemplateColors[templateId] 
        || '#FF4500';

    const activeLogo = company?.logo || '';
    const activeSign = company?.sign || '';
    const activeSeal = company?.seal || '';

    const customer = invoice.customerId || invoice.clientDetails || {};
    const clientName = customer.companyName || customer.customerName || customer.name || (typeof invoice.customerId === 'string' ? invoice.customerId : 'Client Name');
    const clientGst = customer.gstNumber || customer.gstNo || '';
    const clientAddress = customer.billingAddress || customer.address || 
        [customer.addressLine1, customer.addressLine2, customer.location].filter(Boolean).join(', ') || 'Client Address';
    const clientPhone = customer.phone || '';
    const clientEmail = customer.email || '';

    const items = invoice.items || [];
    const rawDate = invoice.invoiceDate || invoice.date;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const formattedDueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Due on Receipt';

    // Helper to format currency
    const inr = (val) => Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    // Amount in words (Indian Rupee Words format: Lakh, Thousand, Hundred)
    const numberToWords = (price) => {
        const sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const convert = (num) => {
            if (num < 10) return sglDigit[num];
            if (num < 20) return dblDigit[num - 10];
            if (num < 100) { let str = tensPlace[Math.floor(num / 10)]; if (num % 10 !== 0) str += " " + sglDigit[num % 10]; return str; }
            if (num < 1000) { let str = sglDigit[Math.floor(num / 100)] + " Hundred"; if (num % 100 !== 0) str += " and " + convert(num % 100); return str; }
            if (num < 100000) { let str = convert(Math.floor(num / 1000)) + " Thousand"; if (num % 1000 !== 0) str += " " + convert(num % 1000); return str; }
            if (num < 10000000) { let str = convert(Math.floor(num / 100000)) + " Lakh"; if (num % 100000 !== 0) str += " " + convert(num % 100000); return str; }
            return "Number too large";
        };
        const num = Math.floor(Number(price) || 0);
        if (num === 0) return "Zero Rupees Only";
        return "Indian Rupees " + convert(num) + " Only";
    };

    // Helper to extract item values safely across both schemas
    const getItemDesc = (it) => it.description || it.itemName || it.name || 'Service Item';
    const getItemHsn = (it) => it.hsn || it.hsnCode || '998314';
    const getItemQty = (it) => Number(it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1));
    const getItemRate = (it) => Number(it.rate !== undefined ? it.rate : (it.unitPrice !== undefined ? it.unitPrice : (it.price || 0)));
    const getItemAmount = (it) => Number(it.amount !== undefined ? it.amount : (it.total !== undefined ? it.total : (getItemRate(it) * getItemQty(it))));

    // Reusable Logo Component
    const renderLogo = (customClass = "max-h-14 max-w-[180px] object-contain mb-3", darkBg = false) => {
        if (!activeLogo) return null;
        return (
            <div className="mb-2.5">
                <img 
                    src={activeLogo} 
                    alt={company.name || "Logo"} 
                    className={`${customClass} ${darkBg ? 'bg-white/95 p-1 rounded-lg shadow-xs' : ''}`} 
                />
            </div>
        );
    };

    // Reusable Company Seal Component
    const renderSeal = (customClass = "h-20 w-20 sm:h-24 sm:w-24 object-contain") => {
        if (!activeSeal) return null;
        return (
            <div className="flex flex-col items-center justify-center shrink-0">
                <img src={activeSeal} alt="Company Seal" className={customClass} />
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                    Official Seal
                </span>
            </div>
        );
    };

    // Reusable Signature Block Component (with integrated Company Seal if uploaded)
    const renderSignature = (align = "right", borderTop = false) => {
        return (
            <div className={`flex items-end gap-6 ${align === 'right' ? 'justify-end ml-auto' : 'justify-start'}`}>
                {activeSeal && (
                    <div className="flex flex-col items-center justify-center shrink-0 mb-1">
                        <img 
                            src={activeSeal} 
                            alt="Company Seal" 
                            className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-xs" 
                        />
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                            Official Seal
                        </span>
                    </div>
                )}
                <div className={`flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'} ${borderTop ? 'pt-4 border-t border-slate-200' : ''}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        for {company.name || 'YOUR COMPANY'}
                    </span>
                    {activeSign ? (
                        <img src={activeSign} alt="Authorised Signature" className="h-14 max-w-[160px] object-contain my-1.5" />
                    ) : (
                        <div className="h-10 w-36 border-b border-dashed border-slate-300 my-1.5 flex items-center justify-center text-[10px] text-slate-400">
                            Signature
                        </div>
                    )}
                    <span className="text-xs font-black text-slate-900 tracking-tight">
                        Authorised Signatory
                    </span>
                </div>
            </div>
        );
    };

    // Render individual templates based on templateId
    switch (templateId) {

        /* ========================================================
           0. SKITE OFFICIAL ORANGE (Official Skite Classic Brand Format)
           ======================================================== */
        case 'skite-orange': {
            const subtotalVal = Number(invoice.subTotal !== undefined ? invoice.subTotal : (invoice.subtotal !== undefined ? invoice.subtotal : (invoice.totalAmount || invoice.grandTotal || 0)));
            const activeTaxRate = invoice.taxRate !== undefined ? Number(invoice.taxRate) : 9;
            const cgstVal = invoice.cgst !== undefined ? Number(invoice.cgst) : (invoice.taxAmount ? Number(invoice.taxAmount) / 2 : (subtotalVal * (activeTaxRate / 100)));
            const sgstVal = invoice.sgst !== undefined ? Number(invoice.sgst) : (invoice.taxAmount ? Number(invoice.taxAmount) / 2 : (subtotalVal * (activeTaxRate / 100)));
            const grandTotalVal = Number(invoice.grandTotal !== undefined ? invoice.grandTotal : (invoice.totalAmount !== undefined ? invoice.totalAmount : (subtotalVal + cgstVal + sgstVal)));

            // Pad minimum 5 table rows for authentic Skite invoice look
            const displayItems = [...items];
            while (displayItems.length < 5) {
                displayItems.push({ description: '', hsn: '', unitPrice: '', qty: '', amount: '', isEmpty: true });
            }

            return (
                <div ref={innerRef} className="bg-white p-8 max-w-4xl mx-auto text-slate-900 font-sans shadow-sm border border-slate-200 printable-card">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4">
                        <div>
                            {/* Logo: Top Left */}
                            {renderLogo("max-h-16 max-w-[200px] object-contain mb-1") || (
                                <div className="px-4 py-2 inline-flex items-center justify-center rounded-md mb-1 shadow-xs" style={{ backgroundColor: activeColor }}>
                                    <span className="text-white font-black text-lg tracking-wider">{(company.name || 'SKITE').toUpperCase()}</span>
                                </div>
                            )}
                            {company.address ? (
                                <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed max-w-xs whitespace-pre-line">{company.address}</p>
                            ) : (
                                <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed max-w-xs whitespace-pre-line">
                                    257- Housing Unit/ Kurichi 003{'\n'}L.I.C colony,{'\n'}Coimbatore - 641021
                                </p>
                            )}
                            <p className="text-xs text-slate-900 font-bold mt-1">GST NO: {company.gstNumber || '33REAPS5023G1ZE'}</p>
                        </div>

                        <div className="text-right">
                            <h1 className="text-3xl font-black tracking-tight" style={{ color: activeColor }}>INVOICE</h1>
                        </div>
                    </div>

                    {/* Issued To (Left) & Invoice No / Date (Right) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-5 pt-3">
                        <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase mb-1">ISSUED TO:</h4>
                            <p className="text-sm font-bold text-slate-900">{clientName.toUpperCase()}</p>
                            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed max-w-md whitespace-pre-line">
                                {clientAddress}
                            </p>
                            {clientGst && (
                                <p className="text-xs font-bold text-slate-900 mt-1">GST: {clientGst}</p>
                            )}
                        </div>

                        <div className="sm:pl-10 space-y-1.5 text-xs text-slate-900 font-bold">
                            <div className="flex items-center">
                                <span className="w-28 text-slate-900">INVOICE NO:</span>
                                <span className="font-bold text-slate-900">{invoice.invoiceNumber || invoice.invoiceNo || 'INV-001'}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-28 text-slate-900">DATE:</span>
                                <span className="font-normal text-slate-800">{formattedDate}</span>
                            </div>
                            {invoice.dueDate && (
                                <div className="flex items-center">
                                    <span className="w-28 text-slate-900">DUE DATE:</span>
                                    <span className="font-normal text-slate-800">{formattedDueDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table with Orange Borders and Clean White Totals */}
                    <div className="mb-4 overflow-x-auto">
                        <table className="w-full text-xs border-collapse" style={{ borderColor: activeColor }}>
                            <thead>
                                <tr className="text-white text-[11px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: activeColor }}>
                                    <th className="p-2.5 text-left border" style={{ borderColor: activeColor }}>DESCRIPTION</th>
                                    <th className="p-2.5 text-center border w-24" style={{ borderColor: activeColor }}>HSN</th>
                                    <th className="p-2.5 text-center border w-28" style={{ borderColor: activeColor }}>UNIT PRICE</th>
                                    <th className="p-2.5 text-center border w-20" style={{ borderColor: activeColor }}>QTY</th>
                                    <th className="p-2.5 text-right border w-32" style={{ borderColor: activeColor }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map((item, idx) => {
                                    if (item.isEmpty) {
                                        return (
                                            <tr key={`empty-${idx}`} className="h-7">
                                                <td className="p-2 border" style={{ borderColor: activeColor }}>&nbsp;</td>
                                                <td className="p-2 border" style={{ borderColor: activeColor }}>&nbsp;</td>
                                                <td className="p-2 border" style={{ borderColor: activeColor }}>&nbsp;</td>
                                                <td className="p-2 border" style={{ borderColor: activeColor }}>&nbsp;</td>
                                                <td className="p-2 border" style={{ borderColor: activeColor }}>&nbsp;</td>
                                            </tr>
                                        );
                                    }
                                    const desc = getItemDesc(item);
                                    const hsn = getItemHsn(item);
                                    const price = getItemRate(item);
                                    const qty = getItemQty(item);
                                    const total = getItemAmount(item);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="p-2.5 border font-semibold text-slate-900" style={{ borderColor: activeColor }}>{desc}</td>
                                            <td className="p-2.5 border text-center font-mono text-slate-700" style={{ borderColor: activeColor }}>{hsn}</td>
                                            <td className="p-2.5 border text-right font-mono text-slate-800" style={{ borderColor: activeColor }}>{price > 0 ? inr(price) : ''}</td>
                                            <td className="p-2.5 border text-center font-mono text-slate-800" style={{ borderColor: activeColor }}>{qty}</td>
                                            <td className="p-2.5 border text-right font-mono text-slate-900" style={{ borderColor: activeColor }}>{total > 0 ? inr(total) : ''}</td>
                                        </tr>
                                    );
                                })}

                                {/* Subtotal Row */}
                                <tr>
                                    <td colSpan={4} className="p-2 text-right font-normal text-slate-900 border" style={{ borderColor: activeColor }}>
                                        Subtotal
                                    </td>
                                    <td className="p-2 text-right font-mono text-slate-900 border" style={{ borderColor: activeColor }}>
                                        {inr(subtotalVal)}
                                    </td>
                                </tr>

                                {/* CGST & SGST (if applicable) */}
                                {activeTaxRate > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={4} className="p-2 text-right font-normal text-slate-900 border" style={{ borderColor: activeColor }}>
                                                CGST {activeTaxRate}%
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-900 border" style={{ borderColor: activeColor }}>
                                                {inr(cgstVal)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} className="p-2 text-right font-normal text-slate-900 border" style={{ borderColor: activeColor }}>
                                                SGST {activeTaxRate}%
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-900 border" style={{ borderColor: activeColor }}>
                                                {inr(sgstVal)}
                                            </td>
                                        </tr>
                                    </>
                                )}

                                {/* TOTAL Row */}
                                <tr>
                                    <td colSpan={4} className="p-2 text-right font-bold text-slate-900 border" style={{ borderColor: activeColor }}>
                                        TOTAL
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900 border" style={{ borderColor: activeColor }}>
                                        {inr(grandTotalVal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Amount in Words */}
                    <div className="mt-3 mb-8 text-xs text-slate-900">
                        <strong className="font-bold">Amount in Words: </strong>
                        <span className="italic text-slate-800">{numberToWords(grandTotalVal)}</span>
                    </div>

                    {/* Bottom: Bank Details (Left), Official Seal (Center), Signatory (Right) */}
                    <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-end gap-6">
                        {/* Bank Details & Contact Info */}
                        <div className="text-xs space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 uppercase mb-1">PAY TO:</h4>
                            <p className="font-bold text-slate-900 text-sm">{company.bankName || 'Union Bank of India'}</p>
                            <p className="text-slate-800">Account Name: <span className="font-semibold">{company.accountName || company.name || 'SKITE'}</span></p>
                            <p className="text-slate-800">Account No: <span className="font-mono text-slate-900">{company.accountNumber || '252511010000196'}</span></p>
                            <p className="text-slate-800">IFSC: <span className="font-mono text-slate-900">{company.ifscCode || 'UBIN0825255'}</span></p>
                            <p className="text-slate-800">Branch: <span className="font-semibold">{company.branch || 'Sundarapuram'}</span></p>

                            <div className="pt-3 text-xs text-slate-900 space-y-0.5">
                                <p>{company.email || 'skitedigital.in@gmail.com'}</p>
                                <p>{company.website || 'www.skitedigital.in'}</p>
                                <p>{company.phone || '8754281434'}</p>
                            </div>
                        </div>

                        {/* Official Seal in Center */}
                        {activeSeal && (
                            <div className="flex flex-col items-center justify-center shrink-0">
                                <img 
                                    src={activeSeal} 
                                    alt="Company Seal" 
                                    className="h-20 w-20 sm:h-24 sm:w-24 object-contain" 
                                />
                            </div>
                        )}

                        {/* Authorised Signatory (Right) */}
                        <div className="flex flex-col items-end text-right">
                            <span className="text-xs text-slate-800">
                                for {(company.name || 'SKITE')}
                            </span>
                            {activeSign ? (
                                <img src={activeSign} alt="Authorised Signature" className="h-14 max-w-[160px] object-contain my-1.5" />
                            ) : (
                                <div className="h-10 w-36 border-b border-dashed border-slate-300 my-1.5 flex items-center justify-center text-[10px] text-slate-400">
                                    Signature
                                </div>
                            )}
                            <span className="text-xs font-bold text-slate-900">
                                Authorised Signatory
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        /* ========================================================
           1. MODERN MINIMALIST (Swiss Clean Monochrome)
           ======================================================== */
        case 'modern-minimal':
            return (
                <div ref={innerRef} className="bg-white p-10 max-w-4xl mx-auto text-slate-900 font-sans shadow-sm border border-slate-200 printable-card">
                    {/* Header with Logo */}
                    <div className="flex justify-between items-start pb-8 border-b border-slate-200">
                        <div>
                            {renderLogo()}
                            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-400 block mb-1">Invoice Document</span>
                            {!activeLogo && <h1 className="text-3xl font-black text-slate-900 tracking-tight">{company.name}</h1>}
                            <p className="text-xs text-slate-500 mt-1">{company.address}</p>
                            <p className="text-xs text-slate-500">{company.email} • {company.phone}</p>
                            {company.gstNumber && <p className="text-xs text-slate-500 font-mono mt-0.5">GSTIN: {company.gstNumber}</p>}
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900">{invoice.invoiceNumber || 'INV-0001'}</h2>
                            <div className="mt-2 text-xs space-y-0.5 text-slate-600">
                                <div><span className="text-slate-400">Date:</span> <span className="font-bold">{formattedDate}</span></div>
                                <div><span className="text-slate-400">Due:</span> <span className="font-bold">{formattedDueDate}</span></div>
                                <div className="pt-1">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                        invoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {invoice.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="py-6 border-b border-slate-200 grid grid-cols-2 gap-6 text-xs">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Billed To</span>
                            <h3 className="font-bold text-slate-900 text-sm">{clientName}</h3>
                            <p className="text-slate-500 mt-0.5">{clientAddress}</p>
                            <p className="text-slate-500">{clientEmail} • {clientPhone}</p>
                            {clientGst && <p className="text-slate-600 font-mono mt-1">GSTIN: {clientGst}</p>}
                        </div>
                        <div className="text-right flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Due</span>
                            <div className="text-3xl font-black text-slate-900">₹{inr(invoice.grandTotal || invoice.totalAmount)}</div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="py-6">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                    <th className="py-2.5 w-12">#</th>
                                    <th className="py-2.5">Item Description</th>
                                    <th className="py-2.5 text-center w-20">Qty</th>
                                    <th className="py-2.5 text-right w-28">Rate (₹)</th>
                                    <th className="py-2.5 text-right w-28">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {items.map((it, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 text-slate-400">{idx + 1}</td>
                                        <td className="py-3 font-semibold text-slate-900">{getItemDesc(it)}</td>
                                        <td className="py-3 text-center text-slate-600">{getItemQty(it)}</td>
                                        <td className="py-3 text-right text-slate-600 font-mono">₹{inr(getItemRate(it))}</td>
                                        <td className="py-3 text-right font-bold text-slate-900 font-mono">₹{inr(getItemAmount(it))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                        <div className="w-72 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span className="font-mono">₹{inr(invoice.subtotal || invoice.subTotal)}</span>
                            </div>
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Discount:</span>
                                    <span className="font-mono">-₹{inr(invoice.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                                <span>GST Tax:</span>
                                <span className="font-mono">₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t-2 border-slate-900 font-black text-sm text-slate-900">
                                <span>Total Amount:</span>
                                <span className="font-mono">₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Authorised Signature */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end">
                        <div className="text-[11px] text-slate-500 max-w-sm space-y-1">
                            {invoice.notes && <p><strong className="text-slate-700">Notes:</strong> {invoice.notes}</p>}
                            {invoice.termsAndConditions && <p className="whitespace-pre-line"><strong className="text-slate-700">Terms:</strong> {invoice.termsAndConditions}</p>}
                        </div>
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           2. CLASSIC CORPORATE (Deep Navy Header & Structured)
           ======================================================== */
        case 'classic-corporate': {
            const corpColor = activeColor || '#0c2340';
            return (
                <div ref={innerRef} className="bg-white max-w-4xl mx-auto text-slate-900 font-sans shadow-md border border-slate-300 printable-card overflow-hidden">
                    {/* Executive Header Banner */}
                    <div className="text-white p-8 flex justify-between items-start" style={{ backgroundColor: corpColor }}>
                        <div>
                            {renderLogo("max-h-12 max-w-[160px] object-contain mb-2", true)}
                            <span className="text-[10px] font-bold tracking-widest text-blue-200 uppercase">Commercial Invoice</span>
                            {!activeLogo && <h1 className="text-3xl font-extrabold tracking-tight mt-0.5">{company.name}</h1>}
                            <p className="text-xs text-blue-100 mt-1">{company.address}</p>
                            <p className="text-xs text-blue-100">Phone: {company.phone} • Email: {company.email}</p>
                            {company.gstNumber && <p className="text-xs text-blue-200 font-mono mt-0.5">GSTIN: {company.gstNumber}</p>}
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold text-blue-200 uppercase">Invoice Number</span>
                            <h2 className="text-2xl font-black text-white">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                invoice.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                            }`}>
                                {invoice.paymentStatus}
                            </span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* Dates & Client Strip */}
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs">
                            <div>
                                <h4 className="font-bold uppercase tracking-wider text-[10px] mb-1.5" style={{ color: corpColor }}>Billed To</h4>
                                <p className="font-bold text-slate-900 text-sm">{clientName}</p>
                                <p className="text-slate-500 mt-0.5">{clientAddress}</p>
                                <p className="text-slate-500">{clientEmail} • {clientPhone}</p>
                                {clientGst && <p className="text-slate-700 font-mono mt-1">GSTIN: {clientGst}</p>}
                            </div>
                            <div className="text-right space-y-1">
                                <div><span className="text-slate-500">Invoice Date:</span> <strong className="text-slate-800 ml-1">{formattedDate}</strong></div>
                                <div><span className="text-slate-500">Payment Due:</span> <strong className="text-slate-800 ml-1">{formattedDueDate}</strong></div>
                                <div><span className="text-slate-500">Account ID:</span> <span className="font-mono text-slate-700 ml-1">{customer.customerId || 'CUST-001'}</span></div>
                            </div>
                        </div>

                        {/* Items */}
                        <table className="w-full text-left text-xs border border-slate-200">
                            <thead className="text-white text-[11px] font-bold" style={{ backgroundColor: corpColor }}>
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">Item Description</th>
                                    <th className="p-3 text-center w-20">Quantity</th>
                                    <th className="p-3 text-right w-28">Rate (₹)</th>
                                    <th className="p-3 text-right w-32">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {items.map((it, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                                        <td className="p-3 font-semibold text-slate-800">{getItemDesc(it)}</td>
                                        <td className="p-3 text-center text-slate-600">{getItemQty(it)}</td>
                                        <td className="p-3 text-right font-mono text-slate-700">₹{inr(getItemRate(it))}</td>
                                        <td className="p-3 text-right font-bold font-mono text-slate-900">₹{inr(getItemAmount(it))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals & Bank Box */}
                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="p-4 rounded-xl text-xs space-y-1 border" style={{ backgroundColor: `${corpColor}10`, borderColor: `${corpColor}30` }}>
                                <h5 className="font-bold uppercase text-[10px] tracking-wider mb-1" style={{ color: corpColor }}>Bank Payment Details</h5>
                                <p><span className="text-slate-500">Bank:</span> <strong className="text-slate-800">{company.bankName}</strong></p>
                                <p><span className="text-slate-500">Account No:</span> <strong className="font-mono text-slate-800">{company.accountNumber}</strong></p>
                                <p><span className="text-slate-500">IFSC:</span> <strong className="font-mono text-slate-800">{company.ifscCode}</strong></p>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 p-1"><span>Subtotal:</span><span className="font-mono">₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                                {invoice.discount > 0 && <div className="flex justify-between text-red-600 p-1"><span>Discount:</span><span className="font-mono">-₹{inr(invoice.discount)}</span></div>}
                                <div className="flex justify-between text-slate-600 p-1"><span>Tax (GST):</span><span className="font-mono">₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                                <div className="flex justify-between p-3 text-white rounded-xl font-bold text-sm" style={{ backgroundColor: corpColor }}>
                                    <span>Grand Total:</span>
                                    <span className="font-mono text-base">₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature Block */}
                        <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                            <div className="text-xs text-slate-500 max-w-md">
                                {invoice.notes || 'Thank you for your business. Please remit payment by the due date.'}
                            </div>
                            {renderSignature("right")}
                        </div>
                    </div>
                </div>
            );
        }

        /* ========================================================
           3. EMERALD TECH (Clean SaaS Modern)
           ======================================================== */
        case 'emerald-tech':
            return (
                <div ref={innerRef} className="bg-white p-8 max-w-4xl mx-auto text-slate-900 font-sans shadow-sm border border-emerald-100 rounded-3xl printable-card">
                    {/* Emerald Top Strip with Logo */}
                    <div className="flex justify-between items-start pb-6 border-b border-emerald-100">
                        <div>
                            {renderLogo()}
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block mb-2">
                                Tax Invoice
                            </span>
                            <h1 className="text-2xl font-black text-slate-900">{company.name}</h1>
                            <p className="text-xs text-slate-500 mt-0.5">{company.address}</p>
                            <p className="text-xs text-slate-500">{company.email} • {company.phone}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-slate-400">Invoice Ref</span>
                            <h2 className="text-2xl font-black text-emerald-700">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <p className="text-xs text-slate-500 mt-1">Issued: <strong>{formattedDate}</strong></p>
                            <p className="text-xs text-slate-500">Due: <strong>{formattedDueDate}</strong></p>
                        </div>
                    </div>

                    {/* Customer Card */}
                    <div className="my-6 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex justify-between items-center text-xs">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">Customer Details</span>
                            <h3 className="font-bold text-slate-900 text-sm">{clientName}</h3>
                            <p className="text-slate-600">{clientEmail} • {clientPhone}</p>
                            <p className="text-slate-500 mt-0.5">{clientAddress}</p>
                        </div>
                        <div className="text-right">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                                {invoice.paymentStatus}
                            </span>
                        </div>
                    </div>

                    {/* Items */}
                    <table className="w-full text-left text-xs mb-6">
                        <thead>
                            <tr className="border-b border-emerald-200 text-emerald-800 font-bold text-[11px]">
                                <th className="py-3">Description</th>
                                <th className="py-3 text-center w-20">Qty</th>
                                <th className="py-3 text-right w-28">Price</th>
                                <th className="py-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 font-semibold text-slate-800">{getItemDesc(it)}</td>
                                    <td className="py-3 text-center text-slate-600">{getItemQty(it)}</td>
                                    <td className="py-3 text-right text-slate-600 font-mono">₹{inr(getItemRate(it))}</td>
                                    <td className="py-3 text-right font-bold text-emerald-800 font-mono">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer Totals */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                        <div className="text-slate-500 max-w-sm">
                            {invoice.notes || 'Thank you for choosing our cloud software platform.'}
                        </div>
                        <div className="w-64 space-y-1.5 text-right">
                            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>GST:</span><span>₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                            <div className="flex justify-between pt-1.5 border-t border-slate-200 font-black text-sm text-emerald-700">
                                <span>Grand Total:</span>
                                <span>₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-6 pt-4 border-t border-emerald-100 flex justify-end">
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           4. CREATIVE STUDIO (Violet Asymmetrical Accent)
           ======================================================== */
        case 'creative-studio':
            return (
                <div ref={innerRef} className="bg-white p-8 max-w-4xl mx-auto text-slate-900 font-sans shadow-sm border-l-8 border-l-violet-600 border border-slate-200 rounded-2xl printable-card">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            {renderLogo()}
                            <span className="text-violet-600 font-bold uppercase text-[10px] tracking-widest block mb-1">Design & Development Agency</span>
                            {!activeLogo && <h1 className="text-3xl font-black text-slate-900">{company.name}</h1>}
                            <p className="text-xs text-slate-500 mt-1">{company.address}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Code</span>
                            <h2 className="text-2xl font-black text-violet-700">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800">
                                {invoice.paymentStatus}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 bg-violet-50/50 rounded-xl mb-6 grid grid-cols-2 text-xs">
                        <div>
                            <span className="text-[10px] font-bold text-violet-700 uppercase block mb-1">Client</span>
                            <p className="font-bold text-slate-900 text-sm">{clientName}</p>
                            <p className="text-slate-500">{clientAddress}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p><span className="text-slate-400">Issued:</span> <strong className="text-slate-800">{formattedDate}</strong></p>
                            <p><span className="text-slate-400">Due:</span> <strong className="text-slate-800">{formattedDueDate}</strong></p>
                        </div>
                    </div>

                    <table className="w-full text-xs text-left mb-6">
                        <thead>
                            <tr className="border-b-2 border-violet-600 text-violet-950 font-bold text-[10px] uppercase">
                                <th className="py-2.5">Service / Deliverable</th>
                                <th className="py-2.5 text-center w-16">Units</th>
                                <th className="py-2.5 text-right w-28">Price</th>
                                <th className="py-2.5 text-right w-28">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 font-semibold text-slate-800">{getItemDesc(it)}</td>
                                    <td className="py-3 text-center text-slate-500">{getItemQty(it)}</td>
                                    <td className="py-3 text-right text-slate-600 font-mono">₹{inr(getItemRate(it))}</td>
                                    <td className="py-3 text-right font-bold text-violet-900 font-mono">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                        <div className="text-xs text-slate-500 max-w-sm">
                            {invoice.notes || 'Custom tailored creative and tech solutions.'}
                        </div>
                        <div className="w-64 space-y-1 text-xs text-right">
                            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Tax (GST 18%):</span><span>₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                            <div className="flex justify-between pt-2 border-t border-violet-200 font-black text-base text-violet-700">
                                <span>Total Due:</span>
                                <span>₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           5. EXECUTIVE SLATE (Dark Luxury Charcoal & Gold)
           ======================================================== */
        case 'executive-slate':
            return (
                <div ref={innerRef} className="bg-white max-w-4xl mx-auto text-slate-900 font-sans shadow-lg border border-slate-300 printable-card overflow-hidden">
                    <div className="bg-slate-950 text-white p-8 flex justify-between items-center border-b-4 border-amber-500">
                        <div>
                            {renderLogo("max-h-12 max-w-[160px] object-contain mb-2", true)}
                            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold">Official Invoice</span>
                            {!activeLogo && <h1 className="text-3xl font-black tracking-tight">{company.name}</h1>}
                            <p className="text-xs text-slate-400 mt-1">{company.address}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-amber-400 font-mono">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <p className="text-xs text-slate-400 mt-1">{formattedDate}</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6 text-xs pb-6 border-b border-slate-200">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Invoice Recipient</h4>
                                <p className="font-extrabold text-base text-slate-900">{clientName}</p>
                                <p className="text-slate-500">{clientAddress}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p><span className="text-slate-400">Payment Status:</span> <strong className="text-amber-700 uppercase ml-1 font-black">{invoice.paymentStatus}</strong></p>
                                <p><span className="text-slate-400">Payment Terms:</span> <span className="text-slate-700 font-bold ml-1">{formattedDueDate}</span></p>
                            </div>
                        </div>

                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-3">Item Description</th>
                                    <th className="p-3 text-center w-20">Quantity</th>
                                    <th className="p-3 text-right w-28">Rate</th>
                                    <th className="p-3 text-right w-32">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((it, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-900">{getItemDesc(it)}</td>
                                        <td className="p-3 text-center text-slate-600">{getItemQty(it)}</td>
                                        <td className="p-3 text-right font-mono text-slate-600">₹{inr(getItemRate(it))}</td>
                                        <td className="p-3 text-right font-bold font-mono text-slate-950">₹{inr(getItemAmount(it))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-between items-end pt-4">
                            <div className="text-xs text-slate-500 max-w-sm">
                                {invoice.notes || 'Executive enterprise billing service.'}
                            </div>
                            <div className="w-72 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span className="font-mono">₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                                <div className="flex justify-between text-slate-600"><span>GST 18%:</span><span className="font-mono">₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                                <div className="flex justify-between p-3 bg-slate-950 text-white rounded font-bold text-sm">
                                    <span className="text-amber-400">Net Due:</span>
                                    <span className="text-amber-400 font-mono text-base">₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="pt-4 border-t border-slate-200 flex justify-end">
                            {renderSignature("right")}
                        </div>
                    </div>
                </div>
            );

        /* ========================================================
           6. COMPACT GRID (High Density & Quick Scan)
           ======================================================== */
        case 'compact-grid':
            return (
                <div ref={innerRef} className="bg-white p-6 max-w-4xl mx-auto text-slate-900 font-sans text-xs shadow-sm border border-slate-300 printable-card">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-300">
                        <div className="flex items-center gap-3">
                            {renderLogo("max-h-10 max-w-[120px] object-contain mb-0")}
                            <div>
                                <h1 className="text-xl font-black">{company.name}</h1>
                                <p className="text-[11px] text-slate-500">{company.address} • GST: {company.gstNumber}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-lg font-black font-mono">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <p className="text-[11px] text-slate-500">{formattedDate}</p>
                        </div>
                    </div>

                    <div className="py-3 grid grid-cols-2 gap-4 border-b border-slate-200 text-[11px]">
                        <div>
                            <strong>To:</strong> {clientName}<br />
                            {clientAddress}
                        </div>
                        <div className="text-right">
                            <strong>Status:</strong> {invoice.paymentStatus} | <strong>Due:</strong> {formattedDueDate}
                        </div>
                    </div>

                    <table className="w-full text-left text-[11px] border border-slate-200 my-4">
                        <thead className="bg-slate-100 font-bold border-b border-slate-300">
                            <tr>
                                <th className="p-2 w-8">#</th>
                                <th className="p-2">Description</th>
                                <th className="p-2 text-center w-16">Qty</th>
                                <th className="p-2 text-right w-24">Rate</th>
                                <th className="p-2 text-right w-24">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {items.map((it, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="p-2 text-slate-400">{idx + 1}</td>
                                    <td className="p-2 font-medium">{getItemDesc(it)}</td>
                                    <td className="p-2 text-center">{getItemQty(it)}</td>
                                    <td className="p-2 text-right font-mono">₹{inr(getItemRate(it))}</td>
                                    <td className="p-2 text-right font-bold font-mono">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-center pt-2 text-[11px]">
                        <span className="text-slate-400">Compact Billing Format</span>
                        <div className="text-right space-y-0.5">
                            <div>Subtotal: ₹{inr(invoice.subtotal || invoice.subTotal)} | GST: ₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</div>
                            <div className="text-sm font-black text-slate-900">Total: ₹{inr(invoice.grandTotal || invoice.totalAmount)}</div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-end">
                        <span className="text-[10px] text-slate-400">Document authenticated digitally.</span>
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           7. ELEGANT SERIF (Boutique & Editorial)
           ======================================================== */
        case 'elegant-serif':
            return (
                <div ref={innerRef} className="bg-[#FAF8F5] p-10 max-w-4xl mx-auto text-stone-900 font-serif shadow-sm border border-stone-200 printable-card">
                    <div className="text-center pb-8 border-b border-stone-300 flex flex-col items-center">
                        {renderLogo("max-h-14 max-w-[180px] object-contain mb-3 mx-auto")}
                        <span className="text-[10px] tracking-[0.3em] uppercase text-stone-500 font-sans block mb-1">Statement of Fees</span>
                        <h1 className="text-4xl font-normal tracking-wide text-stone-900 italic">{company.name}</h1>
                        <p className="text-xs font-sans text-stone-500 mt-2">{company.address}</p>
                    </div>

                    <div className="py-6 grid grid-cols-2 gap-8 text-xs font-sans border-b border-stone-300">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">Invoice For</span>
                            <p className="font-serif text-lg font-bold text-stone-900">{clientName}</p>
                            <p className="text-stone-500">{clientAddress}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="font-serif text-xl font-bold text-stone-900">{invoice.invoiceNumber || invoice.invoiceNo}</p>
                            <p className="text-stone-500">Date: {formattedDate}</p>
                            <p className="text-stone-500">Due: {formattedDueDate}</p>
                            <p><span className="text-[10px] font-bold px-2 py-0.5 bg-stone-200 text-stone-800 rounded">{invoice.paymentStatus}</span></p>
                        </div>
                    </div>

                    <table className="w-full text-left text-xs my-6 font-sans">
                        <thead>
                            <tr className="border-b-2 border-stone-400 text-stone-600 uppercase text-[10px] font-bold">
                                <th className="py-2.5">Item Description</th>
                                <th className="py-2.5 text-center w-16">Qty</th>
                                <th className="py-2.5 text-right w-24">Price</th>
                                <th className="py-2.5 text-right w-28">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 font-serif">
                            {items.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 font-normal text-sm">{getItemDesc(it)}</td>
                                    <td className="py-3 text-center text-xs font-sans text-stone-600">{getItemQty(it)}</td>
                                    <td className="py-3 text-right text-xs font-sans">₹{inr(getItemRate(it))}</td>
                                    <td className="py-3 text-right text-sm font-bold">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end pt-4 border-t border-stone-300 font-sans text-xs">
                        <div className="w-64 space-y-1 text-right">
                            <div className="flex justify-between text-stone-600"><span>Subtotal:</span><span>₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                            <div className="flex justify-between text-stone-600"><span>Tax:</span><span>₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                            <div className="flex justify-between pt-2 border-t border-stone-400 font-serif text-lg font-bold text-stone-900">
                                <span>Total:</span>
                                <span>₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-8 pt-6 border-t border-stone-300 flex justify-between items-end font-sans">
                        <div className="text-xs text-stone-500 max-w-md">
                            {invoice.notes || 'Thank you for your patronage.'}
                        </div>
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           8. BOLD INDUSTRIAL (Swiss Brutalist Contrast)
           ======================================================== */
        case 'bold-industrial':
            return (
                <div ref={innerRef} className="bg-white p-8 max-w-4xl mx-auto text-black font-mono border-4 border-black printable-card">
                    <div className="flex justify-between items-start pb-6 border-b-4 border-black">
                        <div>
                            {renderLogo("max-h-12 max-w-[160px] object-contain mb-2")}
                            <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase tracking-widest inline-block mb-2">
                                INVOICE // {invoice.paymentStatus}
                            </span>
                            {!activeLogo && <h1 className="text-3xl font-black uppercase tracking-tighter">{company.name}</h1>}
                            <p className="text-xs mt-1 text-neutral-600">{company.address}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black">{invoice.invoiceNumber || invoice.invoiceNo}</h2>
                            <p className="text-xs text-neutral-600 mt-1">DATE: {formattedDate}</p>
                            <p className="text-xs text-neutral-600">DUE: {formattedDueDate}</p>
                        </div>
                    </div>

                    <div className="py-4 border-b-4 border-black grid grid-cols-2 text-xs">
                        <div>
                            <span className="font-bold underline block mb-1">CLIENT_RECORD:</span>
                            <p className="font-black text-sm uppercase">{clientName}</p>
                            <p>{clientAddress}</p>
                            {clientGst && <p className="font-bold">GSTIN: {clientGst}</p>}
                        </div>
                        <div className="text-right">
                            <span className="font-bold underline block mb-1">PAYABLE_TOTAL:</span>
                            <span className="text-3xl font-black">₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                        </div>
                    </div>

                    <table className="w-full text-left text-xs my-6 border-2 border-black">
                        <thead className="bg-black text-white font-black uppercase text-[11px]">
                            <tr>
                                <th className="p-2 border-r border-white">ITEM</th>
                                <th className="p-2 text-center w-16 border-r border-white">QTY</th>
                                <th className="p-2 text-right w-28 border-r border-white">RATE</th>
                                <th className="p-2 text-right w-28">AMT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {items.map((it, idx) => (
                                <tr key={idx}>
                                    <td className="p-2 font-bold border-r-2 border-black">{getItemDesc(it)}</td>
                                    <td className="p-2 text-center border-r-2 border-black">{getItemQty(it)}</td>
                                    <td className="p-2 text-right border-r-2 border-black">₹{inr(getItemRate(it))}</td>
                                    <td className="p-2 text-right font-black">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end pt-2 text-xs font-bold">
                        <div className="w-64 space-y-1 text-right">
                            <div>SUBTOTAL: ₹{inr(invoice.subtotal || invoice.subTotal)}</div>
                            <div>GST_TAX: ₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</div>
                            <div className="text-base font-black border-t-2 border-black pt-1">GRAND_TOTAL: ₹{inr(invoice.grandTotal || invoice.totalAmount)}</div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-6 pt-4 border-t-4 border-black flex justify-between items-end">
                        <div className="text-xs text-neutral-500 font-bold uppercase">
                            SYS_AUTH // VERIFIED_DOCUMENT
                        </div>
                        {renderSignature("right")}
                    </div>
                </div>
            );

        /* ========================================================
           9. AURORA GRADIENT (Futuristic Fintech)
           ======================================================== */
        case 'aurora-gradient':
            return (
                <div ref={innerRef} className="bg-white max-w-4xl mx-auto text-slate-900 font-sans shadow-lg border border-slate-200 rounded-3xl printable-card overflow-hidden">
                    {/* Aurora Glow Top Bar */}
                    <div className="h-4 bg-gradient-to-r from-teal-400 via-cyan-500 to-indigo-600"></div>
                    
                    <div className="p-8">
                        <div className="flex justify-between items-start pb-8 border-b border-slate-100">
                            <div>
                                {renderLogo()}
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 mb-2">
                                    Fintech Digital Invoice
                                </span>
                                {!activeLogo && <h1 className="text-3xl font-black text-slate-900">{company.name}</h1>}
                                <p className="text-xs text-slate-500 mt-1">{company.address}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-400">Invoice ID</span>
                                <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                                    {invoice.invoiceNumber || invoice.invoiceNo}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Date: <strong>{formattedDate}</strong></p>
                            </div>
                        </div>

                        <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-cyan-50/40 border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 block mb-1">Customer Info</span>
                                <h3 className="font-extrabold text-slate-900 text-sm">{clientName}</h3>
                                <p className="text-slate-500">{clientAddress}</p>
                            </div>
                            <div className="text-right flex flex-col justify-between">
                                <div><span className="text-slate-400">Due Date:</span> <strong className="text-slate-800 ml-1">{formattedDueDate}</strong></div>
                                <div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
                                        {invoice.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <table className="w-full text-left text-xs mb-6">
                            <thead>
                                <tr className="border-b-2 border-cyan-500 text-cyan-900 font-bold text-[11px]">
                                    <th className="py-3">Line Item</th>
                                    <th className="py-3 text-center w-20">Quantity</th>
                                    <th className="py-3 text-right w-28">Rate</th>
                                    <th className="py-3 text-right w-32">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {items.map((it, idx) => (
                                    <tr key={idx} className="hover:bg-cyan-50/20">
                                        <td className="py-3 font-semibold text-slate-900">{getItemDesc(it)}</td>
                                        <td className="py-3 text-center text-slate-500">{getItemQty(it)}</td>
                                        <td className="py-3 text-right text-slate-600 font-mono">₹{inr(getItemRate(it))}</td>
                                        <td className="py-3 text-right font-black text-slate-900 font-mono">₹{inr(getItemAmount(it))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <div className="w-64 space-y-1.5 text-right text-xs">
                                <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                                <div className="flex justify-between text-slate-600"><span>GST:</span><span>₹{inr(invoice.taxGstAmount || invoice.taxAmount)}</span></div>
                                <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-lg bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                                    <span>Total:</span>
                                    <span>₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            {renderSignature("right")}
                        </div>
                    </div>
                </div>
            );

        /* ========================================================
           10. GST STANDARD TAX INVOICE (Indian Statutory Format)
           ======================================================== */
        case 'gst-tax-standard':
        default:
            const emptyRows = Math.max(0, 3 - items.length);
            return (
                <div ref={innerRef} className="bg-white max-w-4xl mx-auto text-slate-900 font-sans text-xs border-2 border-slate-900 printable-card">
                    {/* Statutory Header */}
                    <div className="text-center py-3.5 bg-slate-100 border-b-2 border-slate-900">
                        <h2 className="text-base font-black uppercase tracking-wider text-slate-900">TAX INVOICE</h2>
                        <p className="text-[11px] text-slate-600 font-semibold">(Issued under Section 31 of CGST Act, 2017)</p>
                    </div>

                    {/* Supplier & Invoice Strip */}
                    <div className="grid grid-cols-2 border-b-2 border-slate-900 divide-x-2 divide-slate-900">
                        <div className="p-5 space-y-1.5">
                            {renderLogo()}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Details of Supplier (Provider)</span>
                            {!activeLogo && <h3 className="font-extrabold text-slate-950 text-base">{company.name}</h3>}
                            <p className="text-slate-600 leading-relaxed text-xs">{company.address}</p>
                            <p className="font-bold text-slate-900 font-mono text-xs">GSTIN / UIN: {company.gstNumber}</p>
                            <p className="text-slate-600 text-xs">State: Tamil Nadu | Code: 33</p>
                        </div>
                        <div className="p-5 space-y-2">
                            <div className="flex justify-between items-center text-xs"><span className="text-slate-500 font-medium">Invoice No:</span> <strong className="font-mono text-slate-950 text-sm">{invoice.invoiceNumber || invoice.invoiceNo}</strong></div>
                            <div className="flex justify-between items-center text-xs"><span className="text-slate-500 font-medium">Invoice Date:</span> <strong className="text-slate-900">{formattedDate}</strong></div>
                            <div className="flex justify-between items-center text-xs"><span className="text-slate-500 font-medium">Due Date:</span> <strong className="text-slate-900">{formattedDueDate}</strong></div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Payment Status:</span>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    invoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                    invoice.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                    'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                    {invoice.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Buyer Strip */}
                    <div className="grid grid-cols-2 border-b-2 border-slate-900 divide-x-2 divide-slate-900">
                        <div className="p-5 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Billed To (Recipient)</span>
                            <h4 className="font-bold text-slate-900 text-sm">{clientName}</h4>
                            <p className="text-slate-600 leading-relaxed text-xs">{clientAddress}</p>
                            <p className="font-bold text-slate-900 font-mono text-xs">GSTIN / UIN: {clientGst || 'Unregistered'}</p>
                        </div>
                        <div className="p-5 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shipped To (Consignee)</span>
                            <h4 className="font-bold text-slate-900 text-sm">{clientName}</h4>
                            <p className="text-slate-600 leading-relaxed text-xs">{customer.shippingAddress || clientAddress}</p>
                            <p className="text-slate-600 text-xs">Place of Supply: Tamil Nadu (33)</p>
                        </div>
                    </div>

                    {/* Itemized Table */}
                    <table className="w-full text-left text-xs border-b-2 border-slate-900">
                        <thead className="bg-slate-100 font-bold border-b border-slate-900 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="py-2.5 px-3 border-r border-slate-900 text-center w-10">#</th>
                                <th className="py-2.5 px-4 border-r border-slate-900">Description of Goods / Services</th>
                                <th className="py-2.5 px-3 border-r border-slate-900 text-center w-24">HSN/SAC</th>
                                <th className="py-2.5 px-3 border-r border-slate-900 text-center w-16">Qty</th>
                                <th className="py-2.5 px-3 border-r border-slate-900 text-right w-28">Rate (₹)</th>
                                <th className="py-2.5 px-4 text-right w-32">Taxable Val (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {items.map((it, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-3 px-3 text-center border-r border-slate-900 text-slate-500">{idx + 1}</td>
                                    <td className="py-3 px-4 font-semibold text-slate-900 border-r border-slate-900">{getItemDesc(it)}</td>
                                    <td className="py-3 px-3 text-center border-r border-slate-900 font-mono text-slate-600">{getItemHsn(it)}</td>
                                    <td className="py-3 px-3 text-center border-r border-slate-900 font-medium">{getItemQty(it)}</td>
                                    <td className="py-3 px-3 text-right border-r border-slate-900 font-mono">₹{inr(getItemRate(it))}</td>
                                    <td className="py-3 px-4 text-right font-bold font-mono text-slate-950">₹{inr(getItemAmount(it))}</td>
                                </tr>
                            ))}
                            {Array.from({ length: emptyRows }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-9">
                                    <td className="border-r border-slate-900">&nbsp;</td>
                                    <td className="border-r border-slate-900">&nbsp;</td>
                                    <td className="border-r border-slate-900">&nbsp;</td>
                                    <td className="border-r border-slate-900">&nbsp;</td>
                                    <td className="border-r border-slate-900">&nbsp;</td>
                                    <td>&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Amount in words & Summary */}
                    <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
                        <div className="p-5 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total In Words</span>
                                <p className="font-bold text-slate-900 text-xs italic mt-1 leading-relaxed">{numberToWords(invoice.grandTotal || invoice.totalAmount)}</p>
                            </div>
                            <div className="mt-5 p-3.5 bg-slate-50 rounded-lg border border-slate-300 text-[11px] space-y-1">
                                <span className="font-bold uppercase text-slate-800 text-[10px] tracking-wider block">Bank Details for NEFT/RTGS:</span>
                                <p className="text-slate-700"><span className="text-slate-500">Bank:</span> <strong className="text-slate-900">{company.bankName}</strong> | <span className="text-slate-500">A/C:</span> <strong className="font-mono text-slate-900">{company.accountNumber}</strong></p>
                                <p className="text-slate-700"><span className="text-slate-500">IFSC:</span> <strong className="font-mono text-slate-900">{company.ifscCode}</strong> | <span className="text-slate-500">Branch:</span> {company.branch}</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-2.5 text-xs">
                            <div className="flex justify-between text-slate-700"><span>Taxable Value:</span><span className="font-mono font-medium">₹{inr(invoice.subtotal || invoice.subTotal)}</span></div>
                            {invoice.discount > 0 && <div className="flex justify-between text-red-600 font-medium"><span>Discount:</span><span className="font-mono">-₹{inr(invoice.discount)}</span></div>}
                            <div className="flex justify-between text-slate-700"><span>CGST (9%):</span><span className="font-mono font-medium">₹{inr((invoice.taxGstAmount || invoice.taxAmount || 0) / 2)}</span></div>
                            <div className="flex justify-between text-slate-700"><span>SGST (9%):</span><span className="font-mono font-medium">₹{inr((invoice.taxGstAmount || invoice.taxAmount || 0) / 2)}</span></div>
                            <div className="flex justify-between pt-3 border-t-2 border-slate-900 font-black text-sm text-slate-950">
                                <span>Total Invoice Value:</span>
                                <span className="font-mono text-base">₹{inr(invoice.grandTotal || invoice.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="p-5 grid grid-cols-2 text-xs">
                        <div className="pr-4">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Declaration:</p>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.</p>
                        </div>
                        <div className="text-right flex flex-col justify-between items-end">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">For {company.name}</span>
                            {activeSign ? (
                                <img src={activeSign} alt="Authorised Signature" className="h-14 max-w-[160px] object-contain my-2" />
                            ) : (
                                <div className="pt-10"></div>
                            )}
                            <span className="border-t border-slate-900 pt-1 text-[11px] font-bold block">Authorized Signatory</span>
                        </div>
                    </div>
                </div>
            );
    }
}
