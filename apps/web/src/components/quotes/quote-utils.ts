export type LineItem = {
  id: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
};

export function computeQuoteTotals(
  items: LineItem[],
  discountType: "%" | "fixed",
  discountValue: string,
  vatRate: string,
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
    0,
  );
  const lineItemTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    return sum + qty * rate * (taxRate / 100);
  }, 0);
  const discount = Math.min(
    discountType === "%" ?
      subtotal * ((parseFloat(discountValue) || 0) / 100)
    : parseFloat(discountValue) || 0,
    subtotal,
  );
  const taxableBase = Math.max(subtotal - discount, 0);
  const vat = taxableBase * ((parseFloat(vatRate) || 0) / 100);
  return {
    subtotal,
    tax_amount: lineItemTax + vat,
    discount,
    total: subtotal - discount + lineItemTax + vat,
  };
}
