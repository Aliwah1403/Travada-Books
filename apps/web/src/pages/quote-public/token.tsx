import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Copy01Icon,
  Download01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from "@travada-books/ui/icons";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import { Textarea } from "@travada-books/ui/components/textarea";
import { Label } from "@travada-books/ui/components/label";
import { useTheme } from "@/components/theme-provider";
import { getQuoteByToken } from "@/lib/queries/quotes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";
import { toast } from "sonner";

export function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["quote-public", token],
    queryFn: () => getQuoteByToken(token!),
    enabled: !!token,
  });

  // Mark viewed when loaded for the first time (best-effort, fire-and-forget)
  const [viewedMarked] = useState(() => {
    if (token) {
      fetch(
        `${SUPABASE_URL}/rest/v1/quotes?token=eq.${encodeURIComponent(token)}&viewed_at=is.null`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({ viewed_at: new Date().toISOString() }),
        },
      ).catch(() => {});
    }
    return true;
  });
  void viewedMarked;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium">Quote not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  // Only sent quotes are actionable
  const isExpired =
    quote.status === "sent" &&
    quote.valid_until != null &&
    new Date(quote.valid_until) < new Date();
  const isTerminal =
    quote.status === "accepted" ||
    quote.status === "declined" ||
    quote.status === "expired" ||
    isExpired;

  const from = (quote.from_details ?? {}) as Record<string, string | null>;
  const customer = (quote.customer_details ?? {}) as Record<string, string | null>;
  const customerName = customer["name"] ?? quote.customer_name ?? "Customer";
  const customerEmail = customer["billing_email"] ?? customer["email"] ?? null;

  const items = (quote.line_items ?? []) as Array<{
    description: string;
    quantity: number;
    price: number;
    tax_rate: number;
  }>;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = items.reduce((s, i) => s + i.quantity * i.price * (i.tax_rate / 100), 0);
  const discount = quote.discount ?? 0;
  const total = subtotal + tax - discount;

  async function callEdgeFunction(name: string, body: Record<string, unknown>) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Request failed");
    }
    return res.json();
  }

  async function handleAccept() {
    setIsSubmitting(true);
    try {
      await callEdgeFunction("accept-quote", { token });
      navigate(`/q/${token}/confirmed?action=accepted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept quote");
      setIsSubmitting(false);
    }
  }

  async function handleDeclineSubmit() {
    setIsSubmitting(true);
    try {
      await callEdgeFunction("decline-quote", { token, reason: declineReason || undefined });
      navigate(`/q/${token}/confirmed?action=declined`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline quote");
      setIsSubmitting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Travada Books" className="size-6" />
          <span className="text-sm font-semibold">Travada Books</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={copyLink}>
            <Copy01Icon size={13} />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-1.5" disabled>
            <Download01Icon size={13} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Quote document */}
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Terminal status banners */}
          {quote.status === "accepted" && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400">
              This quote has been accepted. Thank you!
            </div>
          )}
          {quote.status === "declined" && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
              This quote was declined.
            </div>
          )}
          {isExpired && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
              This quote expired on{" "}
              {format(new Date(quote.valid_until!), "dd/MM/yyyy")}.
            </div>
          )}

          <div className="rounded-lg border bg-white p-10 text-sm shadow-sm dark:bg-card">
            {/* Letterhead */}
            <div className="flex items-start justify-between">
              <div>
                {from["logo_url"] ? (
                  <img
                    src={from["logo_url"]!}
                    alt={from["name"] ?? ""}
                    className="h-9 w-auto max-w-[140px] object-contain"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">
                    {(from["name"] ?? "TB").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="mt-2 space-y-0.5">
                  <p className="font-semibold text-foreground">{from["name"] ?? "Your Business"}</p>
                  {from["address_line1"] && (
                    <p className="text-xs text-muted-foreground">{from["address_line1"]}</p>
                  )}
                  {(from["city"] || from["zip"]) && (
                    <p className="text-xs text-muted-foreground">
                      {[from["city"], from["zip"]].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {from["country_code"] && (
                    <p className="text-xs text-muted-foreground">{from["country_code"]}</p>
                  )}
                  {from["phone"] && (
                    <p className="text-xs text-muted-foreground">{from["phone"]}</p>
                  )}
                  {from["email"] && (
                    <p className="text-xs text-muted-foreground">{from["email"]}</p>
                  )}
                  {from["tax_id"] && (
                    <p className="text-xs text-muted-foreground">PIN: {from["tax_id"]}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">QUOTATION</p>
                <p className="text-xs text-muted-foreground">{quote.quote_number}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prepared For
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="font-medium text-foreground">{customerName}</p>
                  {customer["address_line1"] && (
                    <p className="text-xs text-muted-foreground">{customer["address_line1"]}</p>
                  )}
                  {customer["city"] && (
                    <p className="text-xs text-muted-foreground">{customer["city"]}</p>
                  )}
                  {customer["phone"] && (
                    <p className="text-xs text-muted-foreground">{customer["phone"]}</p>
                  )}
                  {customerEmail && (
                    <p className="text-xs text-muted-foreground">{customerEmail}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Issue date:</span>
                  <span className="font-medium">
                    {quote.issue_date ? format(new Date(quote.issue_date), "dd/MM/yyyy") : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-medium">
                    {quote.valid_until ? format(new Date(quote.valid_until), "dd/MM/yyyy") : "—"}
                  </span>
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
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-dashed">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {quote.currency} {item.price.toLocaleString("en-KE")}
                    </td>
                    <td className="py-3 text-right">{item.tax_rate}%</td>
                    <td className="py-3 text-right font-medium">
                      {quote.currency}{" "}
                      {(item.quantity * item.price * (1 + item.tax_rate / 100)).toLocaleString(
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
                  {quote.currency}{" "}
                  {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex w-48 justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {quote.currency} {tax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex w-48 justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>
                    − {quote.currency}{" "}
                    {discount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <Separator className="my-1 w-48" />
              <div className="flex w-48 justify-between text-sm font-semibold">
                <span>Total</span>
                <span>
                  {quote.currency} {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {quote.note && (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="text-xs font-medium">Notes</p>
                  <p className="mt-1 text-xs text-muted-foreground">{quote.note}</p>
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

          {/* Accept / Decline — only for sent, non-expired quotes */}
          {!isTerminal && (
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
          )}
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
                Reason <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="e.g. Budget constraints, found another provider..."
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
