import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export const DEFAULT_ROBOTRIQ_TERMS = [
  { id: 1, title: 'Quotation Validity', desc: 'This quotation is valid for 15 days from the date of issue unless otherwise specified.' },
  { id: 2, title: 'Prices & Taxes', desc: 'Prices are quoted in INR. GST and applicable taxes are extra unless otherwise specified.' },
  { id: 3, title: 'Payment Terms', desc: '50% Advance against Purchase Order confirmation and remaining 50% shall be paid on the date of invoice.' },
  { id: 4, title: 'Delivery Time', desc: '7 - 10 Days from receipt of Purchase Order, advance payment and final technical approval, subject to material availability.' },
  { id: 5, title: 'Freight & Packing', desc: 'Transportation, packing, loading, unloading and insurance charges are extra unless specifically mentioned.' },
  { id: 6, title: 'Warranty', desc: 'Covered only under the respective manufacturer\'s standard warranty policy.' },
  { id: 7, title: 'Scope of Supply', desc: 'Only items and services mentioned are included. Additional work or modifications are chargeable.' },
  { id: 8, title: 'Ownership', desc: 'All drawings, panel designs, PLC/HMI/SCADA programs, software, source files, BOMs and engineering documents developed by Robotriq Automation Private Limited remain its exclusive intellectual property. Third-party use without written consent is prohibited.' },
  { id: 9, title: 'Installation &\nCommissioning', desc: 'Excluded unless specifically mentioned.' },
  { id: 10, title: 'Customer\nResponsibilities', desc: 'Sensors, cables, panel mounting and field wiring are customer scope unless specified. Customer shall provide AC400V±10%, 50Hz, 3Ø+E power supply and site readiness.' },
  { id: 11, title: 'Travel &\nAccommodation', desc: 'To & From travel, boarding, lodging and local conveyance shall be borne by the customer.' },
  { id: 12, title: 'Support Charges', desc: 'Post-warranty support, programming, commissioning and troubleshooting are chargeable.' },
  { id: 13, title: 'Order Cancellation', desc: 'Confirmed Purchase Orders cannot be cancelled. Customized products are non-refundable.' },
  { id: 14, title: 'Force Majeure', desc: 'Robotriq Automation Private Limited is not responsible for delays beyond its reasonable control.' },
  { id: 15, title: 'Confidentiality', desc: 'Technical documents and quotations are confidential.' },
  { id: 16, title: 'Acceptance', desc: 'Purchase Order placement constitutes acceptance of these Terms & Conditions.' }
];

export default function LetterheadQuotationPreview({ 
    data = {}, 
    onChange = () => {}, 
    onItemChange = () => {},
    onAddItem,
    onRemoveItem,
    headerImage,
    footerImage,
    sealImage,
    signImage,
    isRobotriq = false,
    readOnly = false
}) {
    const activeTopImage = headerImage;
    const activeBottomImage = footerImage;
    const activeSealImage = sealImage;
    const activeSignImage = signImage;

    const inputStyle = {
        background: 'transparent',
        border: readOnly ? 'none' : '1px dashed transparent',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
        padding: '2px',
        transition: 'border 0.2s',
    };
  
    const inputHoverStyle = {
        ...inputStyle,
        border: readOnly ? 'none' : '1px dashed #cbd5e1'
    };

    const InputField = ({ value = '', onChange: onFieldChange, style = {} }) => {
        const [hover, setHover] = useState(false);
        if (readOnly) {
            return <span style={{ ...inputStyle, ...style, display: 'inline-block' }}>{value}</span>;
        }
        return (
            <input 
                value={value} 
                onChange={(e) => onFieldChange && onFieldChange(e.target.value)} 
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{ ...(hover ? inputHoverStyle : inputStyle), ...style }} 
            />
        );
    };

    const TextAreaField = ({ value = '', onChange: onFieldChange, style = {}, rows = 2 }) => {
        const [hover, setHover] = useState(false);
        if (readOnly) {
            return (
                <div style={{ ...inputStyle, whiteSpace: 'pre-wrap', ...style }}>
                    {value}
                </div>
            );
        }
        return (
            <textarea 
                value={value} 
                onChange={(e) => onFieldChange && onFieldChange(e.target.value)} 
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                rows={rows}
                style={{ ...(hover ? inputHoverStyle : inputStyle), resize: 'none', ...style }} 
            />
        );
    };

    const items = data.items || [];
    const terms = data.terms && data.terms.length > 0 ? data.terms : isRobotriq ? DEFAULT_ROBOTRIQ_TERMS : [];

    return (
        <div className="flex flex-col items-center bg-slate-100 p-4 sm:p-6 overflow-y-auto space-y-8 select-text">
            {/* ======================================================== */}
            {/* PAGE 1: QUOTATION & ITEMS SPECIFICATIONS                 */}
            {/* ======================================================== */}
            <div 
                className="bg-white text-black shadow-xl relative"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '36mm 14mm 40mm 14mm',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    boxSizing: 'border-box'
                }}
            >
                {/* Full Width Edge-to-Edge Header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    {activeTopImage && <img src={activeTopImage} alt="Quotation Header" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                </div>

                {/* Header Title & Date / Quote No */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                        Quotation
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>DATE</span>
                            <InputField value={data.date || ''} onChange={(val) => onChange('date', val)} style={{ width: '110px' }} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>NO:</span>
                            <InputField value={data.quotationNo || ''} onChange={(val) => onChange('quotationNo', val)} style={{ width: '150px', fontWeight: 'bold' }} />
                        </div>
                    </div>
                </div>

                {/* Customer Details Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '4px', fontSize: '11px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold', width: '20%', backgroundColor: '#fafafa' }}>
                                Company Name
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px', width: '40%' }}>
                                <TextAreaField value={data.reference || ''} onChange={(val) => onChange('reference', val)} rows={1} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold', width: '18%', backgroundColor: '#fafafa' }}>
                                Customer Name
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px', width: '22%' }}>
                                <TextAreaField value={data.customerName || ''} onChange={(val) => onChange('customerName', val)} rows={1} />
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                Application
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px' }}>
                                <InputField value={data.application || ''} onChange={(val) => onChange('application', val)} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                Phone No
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px 6px' }}>
                                <InputField value={data.phone || ''} onChange={(val) => onChange('phone', val)} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Items & Components Table */}
                {!readOnly && onAddItem && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                        <button
                            type="button"
                            onClick={onAddItem}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: '#0d9488',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={11} /> Add Component Row
                        </button>
                    </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '10.5px', marginBottom: '8px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ border: '1px solid black', padding: '5px', width: '6%', textAlign: 'center' }}>S.NO</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '36%', textAlign: 'left' }}>COMPONENTS</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '12%', textAlign: 'left' }}>MAKE</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '14%', textAlign: 'left' }}>SPECIFICS</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '8%', textAlign: 'center' }}>UNIT</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '12%', textAlign: 'right' }}>RATE</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '12%', textAlign: 'right' }}>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="group">
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', verticalAlign: 'top', position: 'relative' }}>
                                    <span>{item.sno || (idx + 1)}</span>
                                    {!readOnly && onRemoveItem && items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(idx)}
                                            title="Remove component row"
                                            style={{
                                                display: 'inline-block',
                                                marginLeft: '3px',
                                                color: '#ef4444',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '1px'
                                            }}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    )}
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                    <TextAreaField 
                                        value={item.componentText || item.description || ''} 
                                        onChange={(val) => onItemChange(idx, 'componentText', val)} 
                                        rows={4} 
                                    />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                    <TextAreaField value={item.make || item.hsn || ''} onChange={(val) => onItemChange(idx, 'make', val)} rows={2} />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                    <TextAreaField value={item.specifics || item.subDescription || ''} onChange={(val) => onItemChange(idx, 'specifics', val)} rows={2} />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>
                                    <InputField value={item.qty != null ? String(item.qty) : '1'} onChange={(val) => onItemChange(idx, 'qty', val)} style={{ textAlign: 'center' }} />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>
                                    <InputField value={item.price != null ? String(item.price) : ''} onChange={(val) => onItemChange(idx, 'price', val)} style={{ textAlign: 'right' }} />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>
                                    <InputField value={item.amountStr || (item.price && item.qty ? String(Number(item.price) * Number(item.qty)) : '')} onChange={(val) => onItemChange(idx, 'amountStr', val)} style={{ textAlign: 'right' }} />
                                </td>
                            </tr>
                        ))}

                        {/* Special Note & Totals Rows */}
                        <tr>
                            <td colSpan="5" style={{ border: '1px solid black', padding: '4px 6px' }}>
                                <InputField value={data.specNote || 'All Items Included as per your Spec.'} onChange={(val) => onChange('specNote', val)} style={{ color: '#dc2626', fontWeight: 'bold' }} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <InputField value={data.totalAmountStr || String(data.totalAmount || '')} onChange={(val) => onChange('totalAmountStr', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan="5" style={{ padding: '4px' }}></td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <InputField value={data.transportLabel || 'Transport'} onChange={(val) => onChange('transportLabel', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <InputField value={data.transportAmountStr || String(data.transportAmount || '0.00')} onChange={(val) => onChange('transportAmountStr', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan="5" style={{ padding: '4px' }}></td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <InputField value={data.gstLabel || `GST ${data.gstPercent || 18}%`} onChange={(val) => onChange('gstLabel', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <InputField value={data.gstAmountStr || String(data.gstAmount || '0.00')} onChange={(val) => onChange('gstAmountStr', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan="4" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                                <InputField value={data.validityLabel || 'Quote Validity(days)'} onChange={(val) => onChange('validityLabel', val)} style={{ textAlign: 'center', fontWeight: 'bold' }} />
                            </td>
                            <td colSpan="1" style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>
                                <InputField value={data.validityDays != null ? String(data.validityDays) : '15'} onChange={(val) => onChange('validityDays', val)} style={{ textAlign: 'center' }} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                <InputField value={data.netAmountLabel || 'NET AMOUNT'} onChange={(val) => onChange('netAmountLabel', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                <InputField value={data.netAmountStr || String(data.netAmount || '')} onChange={(val) => onChange('netAmountStr', val)} style={{ textAlign: 'right', fontWeight: 'bold' }} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Bank Details & Signature Block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', fontSize: '10.5px', marginTop: '12px' }}>
                    {/* Left: Bank Details */}
                    <div style={{ width: '45%', zIndex: 10 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', textDecoration: 'underline' }}>BANK DETAILS</div>
                        <div style={{ display: 'flex', marginBottom: '2px' }}>
                            <InputField value={data.bankName || ''} onChange={(val) => onChange('bankName', val)} />
                        </div>
                        <div style={{ display: 'flex', marginBottom: '2px' }}>
                            <InputField value={data.branch || ''} onChange={(val) => onChange('branch', val)} />
                        </div>
                        <div style={{ display: 'flex', marginBottom: '2px' }}>
                            <InputField value={data.bobAc || ''} onChange={(val) => onChange('bobAc', val)} />
                        </div>
                        <div style={{ display: 'flex', marginBottom: '2px' }}>
                            <InputField value={data.ifsc || ''} onChange={(val) => onChange('ifsc', val)} />
                        </div>
                        <div style={{ marginTop: '8px', color: '#64748b', fontStyle: 'italic', fontSize: '9.5px' }}>
                            * Fixed 16-point Terms & Conditions are appended automatically as page 2 in the PDF.
                        </div>
                    </div>

                    {/* Center of the Page: Seal Image (Positioned in the middle between Bank Details and Signature) */}
                    {activeSealImage && (
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', zIndex: 5 }}>
                            <img 
                                src={activeSealImage} 
                                alt="Company Seal" 
                                style={{ 
                                    width: '85px', 
                                    height: '85px', 
                                    objectFit: 'contain'
                                }} 
                            />
                        </div>
                    )}

                    {/* Right: Signature Container */}
                    <div style={{ width: '230px', textAlign: 'center', fontWeight: 'bold', marginLeft: 'auto', zIndex: 10 }}>
                        <div style={{ marginBottom: '6px' }}>
                            <InputField value={data.sigThanks || 'Thanking you,'} onChange={(val) => onChange('sigThanks', val)} style={{ textAlign: 'center' }} />
                        </div>
                        <div style={{ marginBottom: '6px', fontSize: '9.5px' }}>
                            <InputField value={data.sigFor || ''} onChange={(val) => onChange('sigFor', val)} style={{ textAlign: 'center', fontSize: '9.5px' }} />
                        </div>

                        {/* Sign Image */}
                        {activeSignImage && (
                            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 10px 0' }}>
                                <img 
                                    src={activeSignImage} 
                                    alt="Authorized Signature" 
                                    style={{ 
                                        height: '42px', 
                                        objectFit: 'contain'
                                    }} 
                                />
                            </div>
                        )}

                        <div style={{ marginTop: '4px' }}>
                            <InputField value={data.sigName || 'Authorised Signatory'} onChange={(val) => onChange('sigName', val)} style={{ textAlign: 'center', fontWeight: 'bold' }} />
                        </div>
                    </div>
                </div>

                {/* Edge-to-Edge Footer */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    {activeBottomImage && <img src={activeBottomImage} alt="Quotation Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                </div>
            </div>

            {/* ======================================================== */}
            {/* PAGE 2: TERMS & CONDITIONS TABLE                         */}
            {/* ======================================================== */}
            <div 
                className="bg-white text-black shadow-xl relative"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '36mm 14mm 40mm 14mm',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    boxSizing: 'border-box'
                }}
            >
                {/* Edge-to-Edge Header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    {activeTopImage && <img src={activeTopImage} alt="Quotation Header" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                </div>

                <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                    QUOTATION TERMS & CONDITIONS
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th style={{ border: '1px solid black', padding: '5px', width: '35px', textAlign: 'center' }}>S.NO</th>
                            <th style={{ border: '1px solid black', padding: '5px', width: '140px', textAlign: 'left' }}>TITLE</th>
                            <th style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>DESCRIPTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {terms.map((term, idx) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                                    {term.id || (idx + 1)}.
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold' }}>
                                    <TextAreaField 
                                        value={term.title} 
                                        onChange={(val) => {
                                            const updatedTerms = [...terms];
                                            updatedTerms[idx] = { ...updatedTerms[idx], title: val };
                                            onChange('terms', updatedTerms);
                                        }} 
                                        rows={1}
                                    />
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px 6px' }}>
                                    <TextAreaField 
                                        value={term.desc} 
                                        onChange={(val) => {
                                            const updatedTerms = [...terms];
                                            updatedTerms[idx] = { ...updatedTerms[idx], desc: val };
                                            onChange('terms', updatedTerms);
                                        }} 
                                        rows={2}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Edge-to-Edge Footer */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    {activeBottomImage && <img src={activeBottomImage} alt="Quotation Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />}
                </div>
            </div>
        </div>
    );
}
