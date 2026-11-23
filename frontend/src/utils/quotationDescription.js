export function quotationDetailLines(value = '') {
    return (value || '').split(/\r?\n/)
        .map(line => line.trim().replace(/^(?:[•●▪◦]\s*|[-*]\s+)+/, '').trim())
        .filter(Boolean);
}

export function quotationTextRuns(text, bold = false) {
    return text.split(/\*\*([^*\n]+)\*\*/g)
        .map((value, index) => ({ text: value, bold: bold || index % 2 === 1 }))
        .filter(run => run.text);
}
