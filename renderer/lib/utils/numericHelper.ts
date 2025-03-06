export const toDollar = (num: number | string) => {
    if (!num || num === '') return '-';
    if (typeof num === 'string') {
        num = parseFloat(num);
    }
    return `$${num.toFixed(2)}`;
}