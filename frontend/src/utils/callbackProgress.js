/**
 * Calculates the current callback progress for a lead.
 * Sequential rules:
 * - Initially only Callback (1) is active.
 * - Callback (2) unlocks only after Callback (1) is saved.
 * - Callback (3) unlocks only after Callback (2) is saved.
 * - Callback (4) unlocks only after Callback (3) is saved.
 * - Callback (5) unlocks only after Callback (4) is saved.
 */
export const getLeadCallbackProgress = (lead) => {
    if (!lead) return { highestSaved: 0, nextAllowed: 1 };

    let highestSaved = 0;

    // 1. Check callback descriptions
    ['1', '2', '3', '4', '5'].forEach(n => {
        if (lead['callback' + n + 'Description'] && String(lead['callback' + n + 'Description']).trim()) {
            highestSaved = Math.max(highestSaved, parseInt(n, 10));
        }
    });

    // 2. Check current lead callStatus
    const statusMatch = (lead.callStatus || '').match(/Callback\s*\(?(\d)\)?/i);
    if (statusMatch) {
        highestSaved = Math.max(highestSaved, parseInt(statusMatch[1], 10));
    }

    // 3. Check callHistory
    if (Array.isArray(lead.callHistory)) {
        lead.callHistory.forEach(h => {
            const hStatus = typeof h === 'string' ? h : h?.status || h?.callStatus || '';
            const hMatch = hStatus.match(/Callback\s*\(?(\d)\)?/i);
            if (hMatch) {
                highestSaved = Math.max(highestSaved, parseInt(hMatch[1], 10));
            }
        });
    }

    const nextAllowed = Math.min(5, highestSaved + 1);

    return { highestSaved, nextAllowed };
};
