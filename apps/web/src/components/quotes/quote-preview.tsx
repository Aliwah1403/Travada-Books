import { useFormatDate } from "@/hooks/use-format-date";
import { Separator } from "@travada-books/ui/components/separator";
import { type SelectedCustomer } from "@/components/invoices/customer-combobox";
import { type UserOrg } from "@/contexts/auth-context";

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
  const discount =
    discountType === "%" ?
      subtotal * ((parseFloat(discountValue) || 0) / 100)
    : parseFloat(discountValue) || 0;
  const vat = (subtotal - discount) * ((parseFloat(vatRate) || 0) / 100);
  return {
    subtotal,
    tax_amount: lineItemTax + vat,
    discount,
    total: subtotal - discount + lineItemTax + vat,
  };
}

export function QuotePreview({
  quoteNumber,
  issueDate,
  validUntil,
  currency,
  items,
  discountType,
  discountValue,
  vatRate,
  notes,
  customer,
  org,
  logoUrl,
}: {
  quoteNumber: string;
  issueDate: Date | undefined;
  validUntil: Date | undefined;
  currency: string;
  items: LineItem[];
  discountType: "%" | "fixed";
  discountValue: string;
  vatRate: string;
  notes: string;
  customer: SelectedCustomer | null;
  org: UserOrg | null;
  logoUrl: string | null;
}) {
  const { formatDate } = useFormatDate();
  const { subtotal, tax_amount, discount, total } = computeQuoteTotals(
    items,
    discountType,
    discountValue,
    vatRate,
  );
  const lineItemTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    return sum + qty * rate * (taxRate / 100);
  }, 0);
  const vat = tax_amount - lineItemTax;

  return (
    <div className="rounded-lg border bg-white p-8 text-sm dark:bg-card">
      <div className="flex items-start justify-between">
        <div>
          {logoUrl ?
            <img
              src={logoUrl}
              alt={org?.name ?? ""}
              className="h-8 w-auto max-w-[120px] object-contain"
            />
          : <div className="flex size-8 items-center justify-center rounded bg-foreground text-background text-[10px] font-bold">
              {org?.name?.slice(0, 2).toUpperCase() ?? "TB"}
            </div>
          }
          <div className="mt-2 space-y-0.5">
            <p className="font-semibold text-foreground">
              {org?.name ?? "Your Business"}
            </p>
            {org?.address_line1 && (
              <p className="text-xs text-muted-foreground">
                {org.address_line1}
              </p>
            )}
            {org?.address_line2 && (
              <p className="text-xs text-muted-foreground">
                {org.address_line2}
              </p>
            )}
            {(org?.city || org?.zip) && (
              <p className="text-xs text-muted-foreground">
                {[org.city, org.zip].filter(Boolean).join(" ")}
              </p>
            )}
            {org?.country_code && (
              <p className="text-xs text-muted-foreground">
                {org.country_code}
              </p>
            )}
            {org?.phone && (
              <p className="text-xs text-muted-foreground">{org.phone}</p>
            )}
            {org?.email && (
              <p className="text-xs text-muted-foreground">{org.email}</p>
            )}
            {org?.tax_id && (
              <p className="text-xs text-muted-foreground">PIN: {org.tax_id}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">QUOTATION</p>
          <p className="text-xs text-muted-foreground">
            {quoteNumber || "QUO-0001"}
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-medium text-foreground">Prepared For</p>
          {customer ?
            <div className="mt-1 space-y-0.5">
              <p className="font-medium text-foreground">{customer.name}</p>
              {customer.address_line1 && (
                <p className="text-muted-foreground">{customer.address_line1}</p>
              )}
              {customer.address_line2 && (
                <p className="text-muted-foreground">{customer.address_line2}</p>
              )}
              {(customer.city || customer.zip) && (
                <p className="text-muted-foreground">
                  {[customer.city, customer.zip].filter(Boolean).join(" ")}
                </p>
              )}
              {customer.country && (
                <p className="text-muted-foreground">{customer.country}</p>
              )}
              {customer.phone && (
                <p className="text-muted-foreground">{customer.phone}</p>
              )}
              {(customer.billing_email || customer.email) && (
                <p className="text-muted-foreground">
                  {customer.billing_email ?? customer.email}
                </p>
              )}
            </div>
          : <p className="mt-1 text-muted-foreground/50 italic">
              No customer selected
            </p>
          }
        </div>
        <div className="text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">
              {issueDate ? formatDate(issueDate) : "—"}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Valid until:</span>
            <span className="font-medium">
              {validUntil ? formatDate(validUntil) : "—"}
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="w-1/2 pb-2 text-left font-medium">Description</th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Qty
            </th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Rate
            </th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const amount =
              (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            return (
              <tr key={item.id} className="border-b border-dashed">
                <td className="py-2 break-words">{item.description || "—"}</td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {item.qty || "0"}
                </td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {item.rate || "0.00"}
                </td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {currency}{" "}
                  {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col items-end gap-1.5 text-xs">
        <div className="flex w-48 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>
            {currency}{" "}
            {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {lineItemTax > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>
              {currency}{" "}
              {lineItemTax.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex w-48 justify-between text-green-600 dark:text-green-400">
            <span>
              Discount{discountType === "%" ? ` (${discountValue}%)` : ""}
            </span>
            <span>
              − {currency}{" "}
              {discount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {vat > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">VAT ({vatRate}%)</span>
            <span>
              {currency}{" "}
              {vat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <Separator className="my-1 w-48" />
        <div className="flex w-48 justify-between font-semibold text-sm">
          <span>Total</span>
          <span>
            {currency}{" "}
            {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {notes && (
        <>
          <Separator className="my-5" />
          <div>
            <p className="text-xs font-medium text-foreground">Notes</p>
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        </>
      )}

      <Separator className="my-5" />
      <p className="text-center text-[10px] text-muted-foreground">
        Powered by Travada Books
      </p>
    </div>
  );
}
