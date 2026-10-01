// Shared totals math for invoices and quotes. Both documents have a
// document-level VAT rate input and a discount input (percent or fixed),
// plus per-line tax rates — the arithmetic is identical, only the call
// sites differ.

export type LineItem = {
  id: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
};

export function computeDocumentTotals(
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

// Rate columns persisted alongside the computed amounts so a document can be
// reopened for editing without losing the VAT rate or the fact that a
// discount was entered as a percentage.
export function toRateColumns(
  discountType: "%" | "fixed",
  discountValue: string,
  vatRate: string,
): { vat_rate: number | null; discount_percent: number | null } {
  // Columns are numeric(5,2) with a 0–100 check; the inputs aren't bounded, so
  // clamp and round here rather than letting a typo fail the whole save.
  const toPercent = (n: number) => Math.round(Math.min(n, 100) * 100) / 100;

  const parsedVat = parseFloat(vatRate);
  const vat_rate = Number.isFinite(parsedVat) && parsedVat > 0 ? toPercent(parsedVat) : null;

  const parsedDiscount = parseFloat(discountValue);
  const discount_percent =
    discountType === "%" && Number.isFinite(parsedDiscount) && parsedDiscount > 0 ?
      toPercent(parsedDiscount)
    : null;

  return { vat_rate, discount_percent };
}

// Legacy rows (saved before vat_rate existed) only have the computed
// tax_amount. Back out the document-level VAT rate from it so editing an
// old invoice/quote doesn't silently zero the VAT out.
export function deriveVatRate({
  lineItems,
  subtotal,
  discount,
  taxAmount,
}: {
  lineItems: { quantity: number; price: number; tax_rate: number }[];
  subtotal: number;
  discount: number;
  taxAmount: number;
}): number | null {
  const lineTax = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.price * (item.tax_rate / 100),
    0,
  );

  const base = subtotal - discount;
  const vatPortion = taxAmount - lineTax;
  if (base <= 0 || vatPortion <= 0.005) return null;

  const rate = (vatPortion / base) * 100;
  const roundedInt = Math.round(rate);
  const reproducedVat = base * (roundedInt / 100);
  if (Math.abs(reproducedVat - vatPortion) <= 0.01) return roundedInt;

  return Math.round(rate * 100) / 100;
}
