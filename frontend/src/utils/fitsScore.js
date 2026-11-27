/**
 * FITS Lead Score & Assessment Utility
 * 
 * Rules:
 * - Familiarity: High (20%), Medium (10%), No (0%)
 * - Intention: Yes (25%), No (0%)
 * - Time: Fast (15%), Move (8%), Stand (0%)
 * - Spend: Speed (10%), Slow (5%), No (0%)
 * 
 * Max score for top tier (High + Yes + Fast + Speed) = 70%
 * Secondary tier (Medium + Yes + Move + Slow) = 48%
 */

export const calculateFitsScore = (fits) => {
    if (!fits) {
        return {
            score: 0,
            breakdown: { familiarity: 0, intention: 0, time: 0, spend: 0 },
            label: 'No Assessment',
            color: 'slate',
            badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
            barColor: 'bg-slate-400',
            ringColor: '#94a3b8'
        };
    }

    const breakdown = { familiarity: 0, intention: 0, time: 0, spend: 0 };
    let score = 0;

    const fam = (fits.familiarity || '').trim().toLowerCase();
    if (fam === 'high') {
        breakdown.familiarity = 20;
        score += 20;
    } else if (fam === 'medium') {
        breakdown.familiarity = 10;
        score += 10;
    }

    const intent = (fits.intention || '').trim().toLowerCase();
    if (intent === 'yes') {
        breakdown.intention = 25;
        score += 25;
    }

    const time = (fits.time || '').trim().toLowerCase();
    if (time === 'fast') {
        breakdown.time = 15;
        score += 15;
    } else if (time === 'move') {
        breakdown.time = 8;
        score += 8;
    }

    const spend = (fits.spend || '').trim().toLowerCase();
    if (spend === 'speed') {
        breakdown.spend = 10;
        score += 10;
    } else if (spend === 'slow') {
        breakdown.spend = 5;
        score += 5;
    }

    let label = 'Low Fit';
    let color = 'slate';
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
    let barColor = 'bg-slate-400';
    let ringColor = '#94a3b8';

    if (score >= 65) {
        label = 'Hot Lead (70%)';
        color = 'emerald';
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
        barColor = 'bg-emerald-500';
        ringColor = '#10b981';
    } else if (score >= 45) {
        label = 'Warm Lead';
        color = 'amber';
        badgeClass = 'bg-amber-50 text-amber-700 border-amber-300 font-bold';
        barColor = 'bg-amber-500';
        ringColor = '#f59e0b';
    } else if (score > 0) {
        label = 'Moderate Fit';
        color = 'blue';
        badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
        barColor = 'bg-blue-500';
        ringColor = '#3b82f6';
    } else {
        label = 'Unscored';
    }

    return {
        score,
        breakdown,
        label,
        color,
        badgeClass,
        barColor,
        ringColor
    };
};

/**
 * Checks if a lead meets full qualification threshold via FITS:
 * Familiarity in [Medium, High] AND
 * Intention === 'yes' AND
 * Time in [Fast, Move] AND
 * Spend in [Speed, Slow]
 */
export const isFitsQualified = (fits) => {
    if (!fits) return false;
    const fam = (fits.familiarity || '').trim().toLowerCase();
    const intent = (fits.intention || '').trim().toLowerCase();
    const time = (fits.time || '').trim().toLowerCase();
    const spend = (fits.spend || '').trim().toLowerCase();

    const famOk = fam === 'high' || fam === 'medium';
    const intentOk = intent === 'yes';
    const timeOk = time === 'fast' || time === 'move';
    const spendOk = spend === 'speed' || spend === 'slow';

    return famOk && intentOk && timeOk && spendOk;
};
