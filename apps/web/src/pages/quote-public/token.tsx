import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Copy01Icon, Download01Icon, CheckmarkCircle01Icon, Cancel01Icon } from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import { Textarea } from "@travada-books/ui/components/textarea";
import { Label } from "@travada-books/ui/components/label";

const mockQuote = {
  number: "QUO-0002",
  customer: "Studio X",
  customerEmail: "hello@studiox.co.ke",
  issueDate: "15/06/2025",
  validUntil: "15/07/2025",
  currency: "USD",
  items: [
    { description: "Brand Identity Design", qty: 1, rate: 600, tax: 0 },
    { description: "Social Media Kit (20 assets)", qty: 1, rate: 200, tax: 0 },
  ],
  notes: "This quote is valid for 30 days. Prices are exclusive of any applicable taxes.",
};

export function PublicQuotePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = mockQuote.items.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0,
  );
  const tax = mockQuote.items.reduce(
    (sum, item) => sum + item.qty * item.rate * (item.tax / 100),
    0,
  );
  const total = subtotal + tax;

  function handleAccept() {
    setIsSubmitting(true);
    // TODO: POST /api/quotes/accept { token }
    // On success, redirect immediately — invoice creation happens in background
    setTimeout(() => {
      navigate(`/q/${token}/confirmed?action=accepted`);
    }, 600);
  }

  function handleDeclineSubmit() {
    setIsSubmitting(true);
    // TODO: POST /api/quotes/decline { token, reason: declineReason }
    // On success, redirect — email to business owner fires in background
    setTimeout(() => {
      navigate(`/q/${token}/confirmed?action=declined`);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            TB
          </div>
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5">
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-1.5">
            <Download01Icon size={13} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Quote */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                  TB
                </div>
                <p className="mt-2 font-semibold text-foreground">
                  Your Business Name
                </p>
                <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">QUOTATION</p>
                <p className="text-xs text-muted-foreground">
                  {mockQuote.number}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prepared For
                </p>
                <p className="mt-1.5 font-medium text-foreground">
                  {mockQuote.customer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mockQuote.customerEmail}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Issue date:</span>
                  <span className="font-medium">{mockQuote.issueDate}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-medium">{mockQuote.validUntil}</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Description</th>
                  <th className="pb-3 text-right font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Tax</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mockQuote.items.map((item, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.qty}</td>
                    <td className="py-3 text-right">
                      {mockQuote.currency} {item.rate.toLocaleString("en-KE")}
                    </td>
                    <td className="py-3 text-right">{item.tax}%</td>
                    <td className="py-3 text-right font-medium">
                      {mockQuote.currency}{" "}
                      {(item.qty * item.rate * (1 + item.tax / 100)).toLocaleString(
                        "en-KE",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-5 flex flex-col items-end gap-1.5 text-xs">
              <div className="flex w-48 justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {mockQuote.currency}{" "}
                  {subtotal.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex w-48 justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {mockQuote.currency}{" "}
                    {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <Separator className="my-1 w-48" />
              <div className="flex w-48 justify-between text-sm font-semibold">
                <span>Total</span>
                <span>
                  {mockQuote.currency}{" "}
                  {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {mockQuote.notes && (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="text-xs font-medium">Notes</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mockQuote.notes}
                  </p>
                </div>
              </>
            )}

            <Separator className="my-6" />
            <p className="text-center text-[10px] text-muted-foreground">
              Powered by{" "}
              <a
                href="https://travadasys.com"
                className="underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Travada Books
              </a>
            </p>
          </div>

          {/* Accept / Decline actions */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => setShowDeclineModal(true)}
              disabled={isSubmitting}
            >
              <Cancel01Icon size={13} />
              Decline
            </Button>
            <Button
              className="gap-1.5"
              onClick={handleAccept}
              disabled={isSubmitting}
            >
              <CheckmarkCircle01Icon size={13} />
              {isSubmitting ? "Accepting..." : "Accept Quote"}
            </Button>
          </div>
        </div>
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-xl">
            <h2 className="text-sm font-semibold">Decline this quote?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Help us understand why — this feedback goes directly to the team.
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label className="text-xs">
                Reason{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="e.g. Budget constraints, found another provider, scope doesn't match..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="text-xs"
                rows={3}
                autoFocus
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeclineModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={handleDeclineSubmit}
                disabled={isSubmitting}
              >
                <Cancel01Icon size={13} />
                {isSubmitting ? "Declining..." : "Decline Quote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
