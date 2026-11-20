import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { topImage as defaultTopImage, bottomImage as defaultBottomImage, sealImage as defaultSealImage, signImage as defaultSignImage } from '../assets/robotriqImages';
import { DEFAULT_ROBOTRIQ_TERMS } from '../components/quoteTemplates/LetterheadQuotationPreview';

function preloadImage(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        if (typeof src === 'string' && src.startsWith('data:image')) {
            return resolve(src);
        }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) {
                // If canvas is tainted or cannot get dataURL, return img directly
                resolve(img);
            }
        };
        img.onerror = () => {
            console.warn('Failed to preload image:', src);
            resolve(null);
        };
        img.src = src;
    });
}

export const generateLetterheadQuotePdf = async (data = {}, branding = {}) => {
    try {
        const doc = new jsPDF();

        const [topImg, botImg, sealImg, signImg] = await Promise.all([
            preloadImage(branding.quotationHeaderImage || defaultTopImage),
            preloadImage(branding.quotationFooterImage || defaultBottomImage),
            preloadImage(branding.quotationSeal || defaultSealImage),
            preloadImage(branding.quotationSign || defaultSignImage)
        ]);

        const scale = { tblFont: 9, tblPad: 2, termFont: 8.5, termGap: 5, sealSize: 24, sigGap: 45 };
        const pgWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const headerHeight = 32; // Aspect ratio
        const footerHeight = 36; // Aspect ratio
        const footerY = pageHeight - footerHeight;

        // Helper for adding edge-to-edge full width header and footer
        const addHeaderFooter = () => {
            if (topImg) {
                try {
                    doc.addImage(topImg, 'PNG', 0, 0, pgWidth, headerHeight, 'TOP_IMG', 'FAST');
                } catch (e) {
                    console.warn('Failed to add top image:', e);
                }
            }
            if (botImg) {
                try {
                    doc.addImage(botImg, 'PNG', 0, footerY, pgWidth, footerHeight, 'BOT_IMG', 'FAST');
                } catch (e) {
                    console.warn('Failed to add bottom image:', e);
                }
            }
        };

        const didDrawPageHook = () => {
            addHeaderFooter();
        };

        // 1. Initial Page Header (Quotation Title & Details)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Quotation", 105, 41, { align: 'center' });
        doc.setFontSize(scale.tblFont);
        doc.setFont("helvetica", "normal");
        doc.text(`DATE   ${data.date || ''}`, 14, 48);
        doc.setFont("helvetica", "bold");
        doc.text(`NO: ${data.quotationNo || ''}`, 155, 48);

        // 2. Customer Details Table
        autoTable(doc, {
            startY: 51,
            theme: 'grid',
            body: [
                ['Company Name', data.reference || '', 'Customer Name', data.customerName || ''],
                ['Application', data.application || '', 'Phone No', data.phone || '']
            ],
            styles: { 
                fontSize: scale.tblFont, 
                textColor: [0, 0, 0], 
                lineColor: [0, 0, 0], 
                lineWidth: 0.2, 
                cellPadding: scale.tblPad 
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30, fillColor: [250, 250, 250] },
                1: { cellWidth: 85 },
                2: { fontStyle: 'bold', cellWidth: 28, fillColor: [250, 250, 250] },
                3: { cellWidth: 39 }
            },
            margin: { top: 38, bottom: 42, left: 14, right: 14 },
            didDrawPage: didDrawPageHook
        });

        // 3. Items Table
        const tableRows = [];
        (data.items || []).forEach((item, idx) => {
            const rawComp = item.componentText || item.description || '';
            const parts = rawComp.split('\n');
            const compName = parts[0];
            const desc = parts.slice(1).join('\n').trim();

            const sno = item.sno || (idx + 1);
            const make = item.make || item.hsn || '';
            const specifics = item.specifics || item.subDescription || '';
            const qty = item.qty != null ? String(item.qty) : '1';
            const price = item.price != null ? String(item.price) : '';
            const amountStr = item.amountStr || (item.price && item.qty ? String(Number(item.price) * Number(item.qty)) : '');

            if (desc.length > 0) {
                tableRows.push([
                    { content: sno, rowSpan: 2 },
                    { content: compName, styles: { fontStyle: 'bold' } },
                    { content: make, rowSpan: 2 },
                    { content: specifics, rowSpan: 2 },
                    { content: qty, rowSpan: 2 },
                    { content: price, rowSpan: 2 },
                    { content: amountStr, rowSpan: 2 }
                ]);
                tableRows.push([
                    { content: desc, styles: { fontStyle: 'normal' } }
                ]);
            } else {
                tableRows.push([
                    sno, 
                    { content: compName, styles: { fontStyle: 'normal' } }, 
                    make, 
                    specifics, 
                    qty, 
                    price, 
                    amountStr
                ]);
            }
        });

        // Totals Rows
        tableRows.push([
            { content: data.specNote || 'All Items Included as per your Spec.', colSpan: 5, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } },
            { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: data.totalAmountStr || String(data.totalAmount || '0.00'), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
        tableRows.push([
            { content: '', colSpan: 5, styles: { lineWidth: 0 } },
            { content: data.transportLabel || 'Transport', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: data.transportAmountStr || String(data.transportAmount || '0.00'), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
        tableRows.push([
            { content: '', colSpan: 5, styles: { lineWidth: 0 } },
            { content: data.gstLabel || 'GST 18%', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: data.gstAmountStr || String(data.gstAmount || '0.00'), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
        tableRows.push([
            { content: data.validityLabel || 'Quote Validity(days)', colSpan: 4, styles: { fontStyle: 'bold', halign: 'center' } },
            { content: String(data.validityDays || '15'), colSpan: 1, styles: { halign: 'center' } },
            { content: data.netAmountLabel || 'NET AMOUNT', styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] } },
            { content: data.netAmountStr || String(data.netAmount || '0.00'), styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] } }
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 2,
            theme: 'grid',
            head: [['S.NO', 'COMPONENTS', 'MAKE', 'SPECIFICS', 'UNIT', 'RATE', 'PRICE']],
            body: tableRows,
            styles: { 
                fontSize: scale.tblFont, 
                textColor: [0, 0, 0], 
                lineColor: [0, 0, 0], 
                lineWidth: 0.2, 
                cellPadding: scale.tblPad 
            },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' }, 
                1: { cellWidth: 61 }, 
                2: { cellWidth: 20 },
                3: { cellWidth: 28 }, 
                4: { cellWidth: 14, halign: 'center' }, 
                5: { cellWidth: 20, halign: 'right' },
                6: { cellWidth: 29, halign: 'right' }
            },
            margin: { top: 38, bottom: 42, left: 14, right: 14 },
            didDrawPage: didDrawPageHook
        });

        // 4. Bank Details & Signature Section
        let finalY = doc.lastAutoTable.finalY + 8;
        
        // Check if enough space for signature block (needs ~48 units before footer at 261mm)
        if (finalY > 205) { 
            doc.addPage();
            addHeaderFooter();
            finalY = 45; 
        }

        // Left side: Bank Details
        let ty = finalY + 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("BANK DETAILS", 14, ty);
        
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.text(`${data.bankName || 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED'}`, 14, ty + 6);
        doc.text(`${data.branch || 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.'}`, 14, ty + 12);
        doc.text(`${data.bobAc || 'ACC NO : 252511010000242'}`, 14, ty + 18);
        doc.text(`${data.ifsc || 'IFSC CODE : UBIN0825255'}`, 14, ty + 24);

        // Right side: Signature Section
        const sigCenter = 160;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(data.sigThanks || "Thanking you,", sigCenter, finalY + 4, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text(data.sigFor || "For ROBOTRIQ AUTOMATION PRIVATE LIMITED", sigCenter, finalY + 11, { align: 'center' });
        
        // Center of the Page: Seal Image (Centered horizontally at X = 90-120mm, right between Bank Details and Signature)
        if (sealImg) {
            try {
                doc.addImage(sealImg, 'PNG', 90, finalY + 18, 30, 30, 'SEAL_IMG', 'FAST');
            } catch (e) {
                console.warn('Failed to add seal image:', e);
            }
        }
        
        // Right side: Signature Image (Placed with clear breathing room)
        if (signImg) {
            try {
                doc.addImage(signImg, 'PNG', sigCenter - 21, finalY + 18, 42, 18, 'SIGN_IMG', 'FAST');
            } catch (e) {
                console.warn('Failed to add sign image:', e);
            }
        }
        
        // Authorised Signatory Text: Placed comfortably below the signature
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(data.sigName || "Authorised Signatory", sigCenter, finalY + 44, { align: 'center' });

        // 5. Terms & Conditions Page (Page 2)
        doc.addPage();
        addHeaderFooter();
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("QUOTATION TERMS & CONDITIONS", 105, 40, { align: 'center' });
        
        const termsData = data.terms && data.terms.length > 0 ? data.terms : DEFAULT_ROBOTRIQ_TERMS;
        const tcBody = termsData.map((term, i) => [term.id || (i + 1), term.title, term.desc]);
        
        autoTable(doc, {
            startY: 45,
            theme: 'grid',
            head: [['S.NO', 'TITLE', 'DESCRIPTION']],
            body: tcBody,
            styles: { 
                fontSize: 8.5, 
                textColor: [0, 0, 0], 
                lineColor: [0, 0, 0], 
                lineWidth: 0.2, 
                cellPadding: 2 
            },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 40, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            margin: { top: 40, bottom: 35, left: 14, right: 14 },
            didDrawPage: didDrawPageHook
        });

        // Filename: <Customer Name>_<Quotation No last 3 digits>.pdf (e.g. Abilash_101.pdf)
        const fullQNo = (data.quotationNo || '').trim();
        const matchDigits = fullQNo.match(/(\d+)$/);
        const lastDigits = matchDigits ? matchDigits[1].slice(-3) : (fullQNo.slice(-3) || '001');
        const rawCust = data.customerName || data.reference || 'Quotation';
        const cleanCust = rawCust.replace(/[\/\\?%*:|"<>]/g, ' ').replace(/\s+/g, '_').trim();
        const fileName = `${cleanCust}_${lastDigits}.pdf`;

        doc.save(fileName);
        return true;
    } catch (err) {
        console.error("PDF Generation Error:", err);
        throw err;
    }
};
