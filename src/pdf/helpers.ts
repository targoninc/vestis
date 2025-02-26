export function getMmByPercentageOf(referenceMm: number, percentage: number) {
    return (referenceMm * percentage / 100).toFixed(2);
}