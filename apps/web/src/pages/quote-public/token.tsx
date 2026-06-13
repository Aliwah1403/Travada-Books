import { useState, useEffect, useRef } from "react";
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
import { Spokes } from "@travada-books/ui/components/spokes";
import { Textarea } from "@travada-books/ui/components/textarea";
import { Label } from "@travada-books/ui/components/label";
import { useTheme } from "@/components/theme-provider";
import { getQuoteByToken } from "@/lib/queries/quotes";
import { InvoicePreview, InvoicePdf } from "@/components/invoice-templates";
import { downloadPdf } from "@/lib/pdf-download";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";
import { toast } from "sonner";
import { trackEvent, LogEvents } from "@/lib/analytics";

export function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["quote-public", token],
    queryFn: () => getQuoteByToken(token!),
    enabled: !!token,
  });

  const viewedMarkedRef = useRef(false);
  useEffect(() => {
    if (!token || viewedMarkedRef.current) return;
    viewedMarkedRef.current = true;
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
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Spokes className="h-7 w-7 text-primary" />
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

  if (quote.status === "draft") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium">Quote not ready</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This quote is still being prepared and hasn't been sent yet.
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
  const customerSnap = (quote.customer_details ?? {}) as Record<string, string | null>;
  const customerName = customerSnap["name"] ?? quote.customer_name ?? "Customer";

  const documentData = {
    label: "QUOTATION",
    number: quote.quote_number,
    currency: quote.currency,
    issueDate: quote.issue_date,
    secondaryDate: quote.valid_until,
    secondaryDateLabel: "Valid until:",
    from: {
      name: from["name"],
      logo_url: from["logo_url"],
      address_line1: from["address_line1"],
      address_line2: from["address_line2"],
      city: from["city"],
      zip: from["zip"],
      country_code: from["country_code"],
      phone: from["phone"],
      email: from["email"],
      tax_id: from["tax_id"],
    },
    customer: {
      name: customerName,
      email: customerSnap["email"],
      billing_email: customerSnap["billing_email"],
      phone: customerSnap["phone"],
      address_line1: customerSnap["address_line1"],
      address_line2: customerSnap["address_line2"],
      city: customerSnap["city"],
      zip: customerSnap["zip"],
      country: customerSnap["country"],
    },
    customerLabel: "Prepared For",
    lineItems: quote.line_items ?? [],
    subtotal: quote.subtotal,
    taxAmount: quote.tax_amount,
    discount: quote.discount,
    total: quote.total,
    note: quote.note,
    publicUrl: window.location.href,
  };

  async function handleDownload() {
    setIsPdfDownloading(true);
    try {
      await downloadPdf(
        <InvoicePdf data={documentData} />,
        quote.quote_number ?? "Quote",
      );
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsPdfDownloading(false);
    }
  }

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
      trackEvent(LogEvents.QuoteAccepted, {
        quote_value: quote?.total,
        currency: quote?.currency,
      });
      navigate(`/q/${token}/confirmed?action=accepted`);
    } catch (err) {
      toast.error("Failed to accept quote. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleDeclineSubmit() {
    setIsSubmitting(true);
    try {
      await callEdgeFunction("decline-quote", { token, reason: declineReason || undefined });
      trackEvent(LogEvents.QuoteRejected, {
        quote_value: quote?.total,
        currency: quote?.currency,
      });
      navigate(`/q/${token}/confirmed?action=declined`);
    } catch (err) {
      toast.error("Failed to decline quote. Please try again.");
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
          <Button variant="outline" className="gap-1.5" onClick={handleDownload} disabled={isPdfDownloading}>
            <Download01Icon size={13} />
            {isPdfDownloading ? "Generating…" : "Download PDF"}
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

          <InvoicePreview data={documentData} />

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
