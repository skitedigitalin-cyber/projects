import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { quotationDetailLines, quotationTextRuns } from './quotationDescription';

import defaultLogo from '../assets/skite-logo.jpg';
import defaultSign from '../assets/Sign.jpg';
import defaultSeal from '../assets/seal.png';

/**
 * Optimizes, downscales and compresses an image (DataURL, URL, or asset import).
 * Keeps PDF size ultra-low (~150 KB - 250 KB) with a fail-safe timeout.
 */
const getOptimizedImage = (imgSrc, maxWidth = 500, maxHeight = 300, quality = 0.8) => new Promise((resolve) => {
    if (!imgSrc) return resolve(null);

    // Fail-safe timeout so slow/blocked remote images never hang PDF generation
    const timer = setTimeout(() => {
        console.warn('Image optimization timeout for:', typeof imgSrc === 'string' ? imgSrc.substring(0, 60) : 'asset');
        resolve(null);
    }, 2500);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        clearTimeout(timer);
        try {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const isPng = typeof imgSrc === 'string' && (imgSrc.includes('image/png') || imgSrc.endsWith('.png'));

            if (!isPng) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);

            if (isPng) {
                resolve({ data: canvas.toDataURL('image/png'), format: 'PNG', width, height });
            } else {
                resolve({ data: canvas.toDataURL('image/jpeg', quality), format: 'JPEG', width, height });
            }
        } catch (e) {
            console.warn('Image optimization error:', e);
            resolve(null);
        }
    };
    img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
    };
    img.src = imgSrc;
});

/**
 * Generates an official, full-page crisp vector A4 PDF Quotation matching the exact Skite brand standard.
 */
export async function generateNativeQuotePdf(quote, company = {}, fileName = 'Quotation') {
    if (!quote) throw new Error('Quotation data required');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const orangeColor = [255, 69, 0];
    const quoteNo = quote.quoteNo || quote.quotationNumber || 'SKT-Q001';
    const rawDate = quote.date || quote.createdAt;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : 'N/A';
    const refNo = quote.refNo || '';

    // Load branding assets with intelligent optimization & downscaling
    const isSkite = company.workspaceBrand === 'skite';

    const activeLogo = isSkite ? (defaultLogo || company?.logo) : (company?.logo || null);
    const activeSign = isSkite ? (defaultSign || company?.sign) : (company?.sign || null);
    const activeSeal = isSkite ? (defaultSeal || company?.seal) : (company?.seal || null);

    const [logoObj, signObj, sealObj] = await Promise.all([
        getOptimizedImage(activeLogo, 450, 240, 0.8),
        getOptimizedImage(activeSign, 400, 180, 0.8),
        getOptimizedImage(activeSeal, 400, 400, 0.8)
    ]);

    // 1. Top Left: Logo (no text below it!)
    if (logoObj?.data) {
        try {
            doc.addImage(logoObj.data, logoObj.format, 14, 10, 42, 22, undefined, 'FAST');
        } catch (e) {
            console.warn("Logo addImage fallback:", e);
        }
    }

    // 2. Sender Details
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(60, 60, 60);
    let addressY = logoObj?.data ? 36 : 14;
    if (company.email || isSkite) {
        doc.text(`Email: ${company.email || (isSkite ? 'skitedigital.in@gmail.com' : '')}`, 14, addressY);
        addressY += 5;
    }
    if (company.phone || isSkite) {
        doc.text(`Phone: ${company.phone || (isSkite ? '8754281434' : '')}`, 14, addressY);
        addressY += 5;
    }
    if (company.website || isSkite) {
        doc.text(`Website: ${company.website || (isSkite ? 'www.skitedigital.in' : '')}`, 14, addressY);
        addressY += 5;
    }
    if (company.gstNumber || isSkite) {
        doc.setFont("helvetica", "bold").setTextColor(30, 30, 30);
        doc.text(`GSTIN: ${company.gstNumber || (isSkite ? '33REAPS5023G1ZE' : '')}`, 14, addressY);
    }

    // 3. Top Right: Title "QUOTE", NO, DATE, REF NO
    doc.setFontSize(26).setFont("helvetica", "bold").setTextColor(255, 69, 0).text("QUOTE", 196, 22, { align: 'right' });
    
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(30, 30, 30);
    doc.text("NO:", 145, 30);
    doc.setFont("helvetica", "normal").setTextColor(0, 0, 0);
    doc.text(quoteNo, 160, 30);

    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(30, 30, 30);
    doc.text("DATE:", 145, 36);
    doc.setFont("helvetica", "normal").setTextColor(0, 0, 0);
    doc.text(dateStr, 160, 36);

    let nextY = 42;
    if (refNo) {
        doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(30, 30, 30);
        doc.text("R.NO:", 145, nextY);
        doc.setFont("helvetica", "normal").setTextColor(0, 0, 0);
        doc.text(refNo, 160, nextY);
        nextY += 6;
    }

    const infoStartY = Math.max(addressY + 22, 54);

    // 4. QUOTE TO (Client Details)
    const client = quote.clientDetails || {};
    const clientName = client.name || client.customerName || client.companyName || 'Client Name';
    const clientGst = client.gst || client.gstNo || client.gstin || '';
    const clientAddress = client.address || client.billingAddress || '';

    doc.setFontSize(10).setTextColor(255, 69, 0).setFont("helvetica", "bold").text("QUOTE TO:", 14, infoStartY);
    doc.setFontSize(10).setTextColor(0, 0, 0).setFont("helvetica", "bold");
    doc.text(clientName, 14, infoStartY + 6);

    let clientY = infoStartY + 11;
    if (clientGst) {
        doc.setFont("helvetica", "bold").setTextColor(0, 0, 0).text(`GSTIN: ${clientGst}`, 14, clientY);
        clientY += 5;
    }
    if (clientAddress) {
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70, 70, 70);
        const clientAddrLines = doc.splitTextToSize(clientAddress, 85);
        doc.text(clientAddrLines, 14, clientY);
        clientY += (clientAddrLines.length * 4.5);
    }

    // 5. Items Table
    const items = quote.items || [];
    const activeTaxRate = quote.taxRate !== undefined ? Number(quote.taxRate) : 18;
    const isZeroTax = activeTaxRate === 0;
    
    const subtotalVal = Number(quote.subtotal !== undefined ? quote.subtotal : (quote.grandTotal || 0));
    const halfTaxRate = activeTaxRate / 2;
    const cgstVal = quote.cgst !== undefined ? Number(quote.cgst) : Math.round(subtotalVal * (halfTaxRate / 100));
    const sgstVal = quote.sgst !== undefined ? Number(quote.sgst) : Math.round(subtotalVal * (halfTaxRate / 100));
    const grandTotalVal = Number(quote.grandTotal !== undefined ? quote.grandTotal : (subtotalVal + (isZeroTax ? 0 : (cgstVal + sgstVal))));

    const descriptionCells = new Map();
    const tableBody = items.map(item => {
        const paragraphs = [
            ...(item.description || '').split(/\r?\n/).map(line => quotationTextRuns(line, true)),
            ...quotationDetailLines(item.subDescription).map(line => [
                { text: '• ', bold: false },
                ...quotationTextRuns(line)
            ])
        ];
        const description = { content: '' };
        descriptionCells.set(description, { paragraphs, drawn: 0 });
        const hsn = item.hsn || '-';
        const price = item.price !== '' && item.price !== undefined ? Number(item.price) : 0;
        const qty = item.qty !== '' && item.qty !== undefined ? Number(item.qty) : 1;
        const total = price * qty;
        
        return [
            description,
            hsn, 
            price > 0 ? price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-', 
            qty.toString(), 
            total > 0 ? total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'
        ];
    });

    if (isZeroTax) {
        tableBody.push(
            [
                { content: 'Subtotal', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } },
                { content: `Rs. ${subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } }
            ],
            [
                { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: orangeColor, textColor: 255 } },
                { content: `Rs. ${grandTotalVal.toLocaleString('en-IN')}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: orangeColor, textColor: 255 } }
            ]
        );
    } else {
        tableBody.push(
            [
                { content: 'Subtotal', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } },
                { content: `Rs. ${subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } }
            ],
            [
                { content: `CGST ${halfTaxRate}%`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } },
                { content: `Rs. ${cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } }
            ],
            [
                { content: `SGST ${halfTaxRate}%`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } },
                { content: `Rs. ${sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 247, 230], textColor: [255, 69, 0] } }
            ],
            [
                { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: orangeColor, textColor: 255 } },
                { content: `Rs. ${grandTotalVal.toLocaleString('en-IN')}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: orangeColor, textColor: 255 } }
            ]
        );
    }

    autoTable(doc, {
        startY: Math.max(clientY + 6, infoStartY + 24),
        head: [['DESCRIPTION', 'DETAILS', 'PRICE', 'QTY', 'TOTAL']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: orangeColor, 
            textColor: 255, 
            lineColor: orangeColor, 
            lineWidth: 0.1, 
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: { 
            lineColor: [255, 230, 210], 
            lineWidth: 0.1, 
            textColor: [30, 30, 30],
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        columnStyles: { 
            0: { cellWidth: 80 },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'center' },
            4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell({ cell, section }) {
            const description = section === 'body' && descriptionCells.get(cell.raw);
            if (!description) return;

            // Measure using bold, the widest weight, and let AutoTable reserve space for each line.
            const font = doc.getFont();
            const fontSize = doc.getFontSize();
            doc.setFont(cell.styles.font, 'bold').setFontSize(cell.styles.fontSize);
            const width = 80 - cell.padding('horizontal');
            description.lines = description.paragraphs.flatMap(runs => {
                const text = runs.map(run => run.text).join('');
                let cursor = 0;
                return doc.splitTextToSize(text, width).map(line => {
                    const start = line ? text.indexOf(line, cursor) : cursor;
                    const end = start + line.length;
                    cursor = end;
                    let offset = 0;
                    return runs.flatMap(run => {
                        const part = run.text.slice(Math.max(0, start - offset), Math.max(0, end - offset));
                        offset += run.text.length;
                        return part ? [{ ...run, text: part }] : [];
                    });
                });
            });
            cell.text = description.lines.map(runs => runs.map(run => run.text).join(''));
            cell.styles.overflow = 'visible';
            doc.setFont(font.fontName, font.fontStyle).setFontSize(fontSize);
        },
        willDrawCell({ cell, section }) {
            const description = section === 'body' && descriptionCells.get(cell.raw);
            if (!description) return;
            description.visibleText = cell.text;
            cell.text = [];
        },
        didDrawCell({ cell, section }) {
            const description = section === 'body' && descriptionCells.get(cell.raw);
            if (!description) return;
            cell.text = description.visibleText;
            const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
            const firstY = cell.y + cell.padding('top') + cell.styles.fontSize / doc.internal.scaleFactor * 0.85;
            for (let index = 0; index < cell.text.length; index++) {
                let x = cell.x + cell.padding('left');
                for (const run of description.lines[description.drawn++] || []) {
                    doc.setFont(cell.styles.font, run.bold ? 'bold' : 'normal');
                    doc.text(run.text, x, firstY + index * lineHeight);
                    x += doc.getTextWidth(run.text);
                }
            }
            doc.setFont(cell.styles.font, cell.styles.fontStyle);
        }
    });

    // 6. Terms & Conditions
    const tableFinalY = (doc.lastAutoTable?.finalY || 160) + 8;
    const terms = quote.terms || '50% advance payment required to start the project.\nFinal 50% on project completion before deployment.';
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(255, 69, 0).text("TERMS & CONDITIONS", 14, tableFinalY);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(60, 60, 60);
    
    let termY = tableFinalY + 5;
    const termLines = doc.splitTextToSize(terms, 110);
    doc.text(termLines, 14, termY);
    const afterTermsY = termY + (termLines.length * 3.8);

    // 7. Bank Details (PAY TO: Bottom Left) & Signatory (Bottom Right)
    const bankY = Math.max(afterTermsY + 8, 220);
    if (company.bankName || company.accountNumber || isSkite) {
        doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(255, 69, 0).text("Payment Details:", 14, bankY);
        doc.setFont("helvetica", "bold").setTextColor(0, 0, 0).text(company.bankName || (isSkite ? 'Union Bank of India' : ''), 14, bankY + 5);
        doc.setFont("helvetica", "normal").setTextColor(60, 60, 60);
        doc.text(`Account Name: ${company.accountName || company.name || (isSkite ? 'SKITE' : '')}`, 14, bankY + 10);
        doc.text(`Account No: ${company.accountNumber || (isSkite ? '252511010000196' : '')}`, 14, bankY + 15);
        doc.text(`IFSC: ${company.ifscCode || (isSkite ? 'UBIN0825255' : '')}`, 14, bankY + 20);
        doc.text(`Branch: ${company.branch || (isSkite ? 'Sundarapuram' : '')}`, 14, bankY + 25);
    }

    // 8. Official Seal (100% true circular aspect ratio!)
    if (sealObj?.data) {
        try {
            const aspect = (sealObj.width && sealObj.height) ? (sealObj.width / sealObj.height) : 1;
            const targetHeight = 35;
            const targetWidth = targetHeight * aspect;
            doc.addImage(sealObj.data, sealObj.format, 102, bankY + 3, targetWidth, targetHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Seal addImage fallback:", e);
        }
    }

    // 9. Authorised Signatory (Right)
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(60, 60, 60).text(`for ${company.name || (isSkite ? 'SKITE' : 'Authorized Signatory')}`, 150, bankY + 10);
    if (signObj?.data) {
        try {
            const signAspect = (signObj.width && signObj.height) ? (signObj.width / signObj.height) : 2.5;
            const signHeight = 20;
            const signWidth = signHeight * signAspect;
            doc.addImage(signObj.data, signObj.format, 142, bankY + 14, Math.min(signWidth, 52), signHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Sign addImage fallback:", e);
        }
    }
    doc.setFont("helvetica", "bold").setTextColor(0, 0, 0).text("Authorised Signatory", 150, bankY + 38);

    doc.setFontSize(8).setTextColor(120, 120, 120).setFont("helvetica", "italic");
    doc.text("This is a Computer Generated Quotation", 105, 290, { align: "center" });

    const safeName = (fileName || 'Quotation').replace(/[\/\\]/g, '-');
    doc.save(`${safeName}.pdf`);
    return true;
}
