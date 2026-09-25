import { db } from "./db.ts"

export type EmailStatusTable = "invoices" | "quotes" | "statements"

// Records email delivery state directly on the document row so the app can
// show "still sending…" / "wasn't delivered" without the customer being left
// in the dark about a send that silently failed (see the callback chain in
// generate-document-pdf.ts and DOCUMENT-PDF-PLAN.md). Never throws — a
// status write failing must not turn an otherwise-successful (or
// already-failed) send into an unrelated 500.
export async function setEmailStatus(
  table: EmailStatusTable,
  id: string,
  status: "queued" | "sent" | "failed",
  error?: string | null,
): Promise<void> {
  try {
    const { error: updateError } = await db
      .from(table)
      .update({
        email_status: status,
        email_error: status === "failed" ? (error ?? "Delivery failed.") : null,
        email_status_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (updateError) {
      console.error(`setEmailStatus(${table}, ${id}, ${status}) failed:`, updateError)
    }
  } catch (err) {
    console.error(`setEmailStatus(${table}, ${id}, ${status}) threw:`, err)
  }
}
