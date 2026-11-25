const pattern = /^Receipt:/;

function parseLegacyReceipt(row) {
    if (row.type !== 'Income' || !pattern.test(row.desc || '')) return null;
    const desc = row.desc;
    const metadata = Object.fromEntries([...desc.matchAll(/\[([^:\]]+):\s*([^\]]*)\]/g)]
        .map(([, field, value]) => [field, value.trim()]));
    const [, number = '', orderId = '', name = '', course = ''] =
        /^Receipt:\s*(\S+)\s*\(Order:\s*([^)]*)\)\s*-\s*([^(]+)\(([^)]*)\)/.exec(desc) || [];
    const amount = key => metadata[key] !== undefined && Number.isFinite(Number(metadata[key])) ? Number(metadata[key]) : null;
    return {
        number, orderId: orderId.trim(), studentName: name.trim(), course: course.trim(),
        address: metadata.Addr || '', paymentMode: metadata.Mode || 'Bank Transfer',
        reference: metadata.UTR || '', nextDueDate: metadata.DueDate || '',
        totalFees: amount('TotalFees'), previouslyPaid: amount('PrevPaid'), balance: amount('Balance')
    };
}

function nextReceiptNumber(numbers, year) {
    let first = 0;
    let second = 0;
    for (const number of numbers) {
        const match = /^RQ\/(\d{2})\/(\d+)\/(\d+)$/.exec(number);
        if (match?.[1] !== year) continue;
        first = Math.max(first, Number(match[2]));
        second = Math.max(second, Number(match[3]));
    }
    return `RQ/${year}/${String(first + 1).padStart(2, '0')}/${String(second + 1).padStart(2, '0')}`;
}

module.exports = { pattern, parseLegacyReceipt, nextReceiptNumber };
