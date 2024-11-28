export function parsePrice(text: string, inCents = true) {
    if (!text) {
        return 0;
    }

    text = text.replaceAll(",", ".");
    text = text.replaceAll("€", "");

    const price = parseFloat(text);
    if (isNaN(price)) {
        return 0;
    }

    return inCents ? price * 100 : price;
}

export function createPriceFromCents(cents: number) {
    return `${(cents / 100).toFixed(2)}€`;
}
