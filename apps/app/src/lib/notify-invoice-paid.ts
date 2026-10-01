import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

// Fires the "invoice paid" business notification (email + in-app, per owner
// prefs). Best-effort: by the time this is called the payment is already
// recorded, so a failure here only means a missed notification, not a
// broken payment — warn instead of surfacing a hard error.
export async function notifyInvoicePaid(invoiceId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-invoice-paid", {
      body: { invoiceId },
    })
    if (error) {
      console.error("notify-invoice-paid failed:", error)
      toast.warning("Invoice marked as paid, but the notification email failed to send.")
    }
  } catch (err) {
    console.error("notify-invoice-paid failed:", err)
    toast.warning("Invoice marked as paid, but the notification email failed to send.")
  }
}
