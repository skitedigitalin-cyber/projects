export const TEMPLATE_COLOR_PRESETS = [
    { name: 'Skite Orange', color: '#FF4500', label: 'Orange' },
    { name: 'Royal Blue', color: '#2563EB', label: 'Blue' },
    { name: 'Emerald Green', color: '#059669', label: 'Green' },
    { name: 'Violet Purple', color: '#7C3AED', label: 'Purple' },
    { name: 'Rose Crimson', color: '#E11D48', label: 'Rose' },
    { name: 'Amber Gold', color: '#D97706', label: 'Amber' },
    { name: 'Teal Cyan', color: '#0D9488', label: 'Teal' },
    { name: 'Deep Indigo', color: '#4F46E5', label: 'Indigo' },
    { name: 'Executive Slate', color: '#334155', label: 'Slate' },
    { name: 'Midnight Dark', color: '#0F172A', label: 'Dark' }
];

export const INVOICE_TEMPLATES = [
    {
        id: 'skite-orange',
        name: 'Signature Orange',
        badge: 'Standard',
        tagline: 'Signature Orange Header, Itemized GST & Bank Authorization',
        accentColor: '#FF4500',
        headerBg: 'bg-[#FF4500]',
        description: 'Modern business invoice layout featuring signature orange accents, company logo, itemized GST table, full bank payment details, and authorized signature block.'
    },
    {
        id: 'modern-minimal',
        name: 'Modern Minimalist',
        badge: 'Recommended',
        tagline: 'Clean Swiss Monochrome & Stark Typography',
        accentColor: '#0f172a',
        headerBg: 'bg-white',
        description: 'Ultra-clean layout with disciplined margins, thin hairline rules, and high contrast typography. Perfect for modern agencies and digital consultancies.'
    },
    {
        id: 'classic-corporate',
        name: 'Classic Corporate',
        badge: 'Enterprise',
        tagline: 'Executive Navy Header & Structured Borders',
        accentColor: '#1e3a8a',
        headerBg: 'bg-blue-900',
        description: 'Formal corporate presentation featuring deep navy header banners, double bordered summary boxes, and traditional institutional formatting.'
    },
    {
        id: 'emerald-tech',
        name: 'Emerald Tech',
        badge: 'Popular',
        tagline: 'Vibrant Green Accents & Modern SaaS Cards',
        accentColor: '#059669',
        headerBg: 'bg-emerald-600',
        description: 'Contemporary tech styling with emerald accents, rounded pill badges, soft shadows, and clean tabular data presentation.'
    },
    {
        id: 'creative-studio',
        name: 'Creative Studio',
        badge: 'Design Agency',
        tagline: 'Violet Edge Bar & Asymmetric Balance',
        accentColor: '#7c3aed',
        headerBg: 'bg-violet-600',
        description: 'Dynamic asymmetric agency layout with bold purple visual hierarchy, colored pill chips, and generous creative breathing room.'
    },
    {
        id: 'executive-slate',
        name: 'Executive Slate',
        badge: 'Luxury',
        tagline: 'Charcoal Header & Warm Gold Accents',
        accentColor: '#334155',
        headerBg: 'bg-slate-900',
        description: 'High-end dark slate theme with refined amber highlights, crisp luxury headers, and tailored invoice breakdowns.'
    },
    {
        id: 'compact-grid',
        name: 'Compact Grid',
        badge: 'High Density',
        tagline: 'Dense Table, Zebra Rows & Quick Scan',
        accentColor: '#475569',
        headerBg: 'bg-slate-100',
        description: 'Engineered for wholesale, hardware, and multi-line billing. Maximizes item density with zebra-striped rows and barcode/QR placeholder.'
    },
    {
        id: 'elegant-serif',
        name: 'Elegant Serif',
        badge: 'Boutique',
        tagline: 'Editorial Serif Headings & Warm Stone Tones',
        accentColor: '#78350f',
        headerBg: 'bg-stone-50',
        description: 'Sophisticated boutique aesthetic using classic serif title typography, warm neutral stone borders, and centered heritage letterhead.'
    },
    {
        id: 'bold-industrial',
        name: 'Bold Industrial',
        badge: 'Swiss Brutalist',
        tagline: 'Thick Monospaced Rules & Raw Blueprint Feel',
        accentColor: '#000000',
        headerBg: 'bg-black',
        description: 'High-impact technical invoice featuring 2px solid dark borders, monospace uppercase metadata labels, and raw declassified invoice aesthetics.'
    },
    {
        id: 'aurora-gradient',
        name: 'Aurora Gradient',
        badge: 'Fintech',
        tagline: 'Smooth Cyan-Indigo Header Glow',
        accentColor: '#0284c7',
        headerBg: 'bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600',
        description: 'Futuristic fintech visual world with smooth mesh gradient top bar, glowing rounded cards, and floating status indicator.'
    },
    {
        id: 'gst-tax-standard',
        name: 'GST Tax Invoice',
        badge: 'Statutory GST',
        tagline: 'Government Standard with HSN & Tax Breakups',
        accentColor: '#0f766e',
        headerBg: 'bg-teal-900',
        description: 'Complete Indian Statutory GST format compliant with GST rules: Supplier/Buyer GSTIN, State Codes, HSN/SAC breakdown table, Bank account box, and Authorized Signatory block.'
    }
];

export const getInvoiceTemplates = (isSkite = false) => {
    return INVOICE_TEMPLATES.map(t => {
        if (t.id === 'skite-orange') {
            return {
                ...t,
                name: isSkite ? 'Skite Official Orange' : 'Signature Orange',
                badge: isSkite ? 'Official Brand' : 'Standard',
                description: isSkite
                    ? 'Official Skite invoice layout featuring signature orange accents, company logo, itemized GST table, full bank payment details, and authorized signature block.'
                    : 'Modern business invoice layout featuring signature orange accents, company logo, itemized GST table, full bank payment details, and authorized signature block.'
            };
        }
        return t;
    });
};

export const SAMPLE_INVOICE = {
    _id: 'sample-inv-001',
    invoiceNumber: 'INV-2026-0042',
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    paymentStatus: 'Paid',
    customerId: {
        customerName: 'Suresh Kumar',
        companyName: 'NexGen Digital Solutions Pvt Ltd',
        customerId: 'CUST-089',
        email: 'billing@nexgendigital.in',
        phone: '+91 98765 43210',
        billingAddress: '#42, 4th Cross, Indiranagar 100 Feet Road, Bengaluru, Karnataka 560038',
        gstNumber: '29ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F'
    },
    items: [
        { itemName: 'WEB DEVELOPMENT & UI/UX DESIGN', description: 'WEB DEVELOPMENT & UI/UX DESIGN', hsn: '998314', quantity: 1, qty: 1, rate: 45000, price: 45000, amount: 45000, total: 45000 },
        { itemName: 'META ADS & CAMPAIGN MANAGEMENT', description: 'META ADS & CAMPAIGN MANAGEMENT', hsn: '998365', quantity: 1, qty: 1, rate: 35000, price: 35000, amount: 35000, total: 35000 },
        { itemName: 'VIDEO SHOOT & SOCIAL MEDIA CREATIVE', description: 'VIDEO SHOOT & SOCIAL MEDIA CREATIVE', hsn: '998382', quantity: 2, qty: 2, rate: 10000, price: 10000, amount: 20000, total: 20000 }
    ],
    subtotal: 100000,
    subTotal: 100000,
    taxRate: 9,
    cgst: 9000,
    sgst: 9000,
    taxGstAmount: 18000,
    grandTotal: 118000,
    notes: 'Payment received via UPI / Bank Transfer with reference #UTR-9081238912.',
    termsAndConditions: '1. Invoices are due within 14 days of issue.\n2. Goods/Services once rendered are non-refundable.\n3. Late payments subject to 1.5% interest per month.'
};
