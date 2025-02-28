export function getMmByPercentageOf(referenceMm: number, percentage: number) {
    return (referenceMm * percentage / 100);
}

export function openBlob(pdf: Blob) {
    window.open(URL.createObjectURL(pdf));
}